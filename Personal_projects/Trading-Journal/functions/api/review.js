// POST /api/review - proxies the Claude trade review so the Anthropic API key never reaches
// the browser. Port of app/review.py's run(), minus the DB write (the client does that itself,
// under its own authenticated/RLS-scoped Supabase session, right after this returns).
import Anthropic from '@anthropic-ai/sdk';
import { verifyUser, unauthorized } from '../_lib/verifyUser.js';

const SYSTEM = `You are reviewing one trade for Veekay, a disciplined retail trader who journals every trade.
Grade the trade against Veekay's written rules, which are included below, not against generic advice.

Rules of engagement:
- Judge only what was knowable at entry. The P&L never decides whether an entry was valid.
- Use the screenshots and order details as evidence. If something is not visible or not recorded, mark that
  gate "insufficient_evidence" - never invent prices, levels or indicator readings, and never guess a pass.
- Cite the rule you are applying by name (for example "Room >= 1R" or "stop set before entry").
- Be direct and concise. No cheerleading, no generic trading advice.

Answer in this structure:
**Verdict** - one line: entry valid / invalid, exit valid / invalid, and the category you would assign.
**Rule check** - a short table: rule | pass / fail / insufficient evidence | evidence.
**Execution** - order types, fills against the plan, stop handling, partials.
**Plan vs actual** - only for options and swing trades.
**The one thing to fix** - a single concrete action for the next trade.
`;

const GATE_KEYS = ['established_level', 'trigger', 'room', 'mom_ttm', 'ema_extension', 'exit_structure'];

const GATE_ADDENDUM = `
Also assess these six gates - the ones that genuinely need the chart, not the ones that are pure
arithmetic (size, stop-recorded and the 5-minute reset are checked separately, in code, not by you):
- established_level: for Setup A, has the support held for several candles (a low formed 1-2 candles
  ago is NOT established)? For Setup B, did C1 break AND close above established resistance?
- trigger: did C2 actually cross C1's high intrabar, on the candle actually bought (not anticipated,
  not a later candle after a missed C2)?
- room: is (resistance - entry) >= (entry - stop) against the next KNOWN resistance/HOD at entry time,
  with no danger structure (double top, repeated rejection) overhead?
- mom_ttm: are both MOM and TTM improving toward positive? Negative-and-falling fails; positive-but-
  falling is a risk signal to note, not a fail.
- ema_extension: is the fill extended more than about $0.20 above the 8 EMA (read with volatility)?
  Also note here if the 8 EMA is below the 21 EMA (alignment required in all setups).
- exit_structure: did the scale-out/hold-or-exit sequence follow the exit plan (25% at a peak, then
  candle-by-candle against the prior high), judged by chart structure, not by what price did later?

For each: "result" is "pass", "fail", or "insufficient_evidence" (insufficient evidence is not a pass),
and "evidence" is one or two sentences of what was visible at entry (or at the relevant exit point).

Then fill in the \`proposed\` object so it matches your gates and narrative verdict exactly - these values
pre-fill Veekay's edit form for him to review and save himself, they are never applied automatically.
Leave a field empty ("" or []) when the evidence is insufficient to recommend a value; never guess
just to fill every field.`;

const SETUPS = ['A', 'B', 'C', ''];
const CATEGORIES = ['A', 'B', 'C', 'X', 'D', 'E', ''];
const VIOLATIONS = ["No established support", "Inadequate room to resistance", "Extended / chase",
  "Anticipated trigger", "MOM/TTM not confirming", "Late entry / setup expired",
  "Planned risk over $20", "No stop set before entry", "Moved or removed stop",
  "Early exit", "Held past stop"];
const EMOTIONS = ["FOMO", "Fear exit", "Panic", "Revenge", "Overconfident", "Hesitated", "Calm / planned"];

function scalpSchema() {
  const gate = {
    type: 'object',
    properties: { result: { type: 'string', enum: ['pass', 'fail', 'insufficient_evidence'] }, evidence: { type: 'string' } },
    required: ['result', 'evidence'], additionalProperties: false,
  };
  const gates = {};
  for (const k of GATE_KEYS) gates[k] = gate;
  return {
    type: 'object',
    properties: {
      narrative: { type: 'string', description: 'The full review, as markdown, in the structure given above.' },
      gates: { type: 'object', properties: gates, required: GATE_KEYS, additionalProperties: false },
      proposed: {
        type: 'object',
        properties: {
          setup: { type: 'string', enum: SETUPS }, setup_valid: { type: 'string', enum: ['Y', 'N', ''] },
          entry_valid: { type: 'string', enum: ['Y', 'N', ''] }, exit_valid: { type: 'string', enum: ['Y', 'N', ''] },
          category: { type: 'string', enum: CATEGORIES },
          violations: { type: 'array', items: { type: 'string', enum: VIOLATIONS } },
          emotions: { type: 'array', items: { type: 'string', enum: EMOTIONS } },
        },
        required: ['setup', 'setup_valid', 'entry_valid', 'exit_valid', 'category', 'violations', 'emotions'],
        additionalProperties: false,
      },
    },
    required: ['narrative', 'gates', 'proposed'], additionalProperties: false,
  };
}

function tradeText(kind, trade) {
  const skip = new Set(['legacy_json', 'id', 'created_at', 'updated_at', 'checklist']);
  const lines = [];
  for (const [k, v] of Object.entries(trade)) {
    if (skip.has(k) || v === null || v === undefined || v === '') continue;
    lines.push(`${k}: ${v}`);
  }
  return lines.join('\n');
}

export async function onRequestPost({ request, env }) {
  const user = await verifyUser(request, env);
  if (!user) return unauthorized();
  if (!env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured on this Pages project.' }), { status: 500 });
  }

  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), { status: 400 }); }
  const { kind, trade, rulesText, images, model } = body;
  if (!kind || !trade) return new Response(JSON.stringify({ error: 'Missing kind or trade.' }), { status: 400 });

  const content = [];
  for (let i = 0; i < Math.min((images || []).length, 8); i++) {
    const img = images[i];
    content.push({ type: 'text', text: `Screenshot ${i + 1}:` });
    content.push({ type: 'image', source: { type: 'base64', media_type: img.mime || 'image/jpeg', data: img.dataBase64 } });
  }
  content.push({ type: 'text', text: `## Trade\n${tradeText(kind, trade)}\n\nReview this trade.` });

  const structured = kind === 'scalp';
  const system = SYSTEM + `\n\n## Veekay's rules (${kind})\n${rulesText || ''}` + (structured ? GATE_ADDENDUM : '');
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const kwargs = {
    model: model || 'claude-sonnet-5-5',
    max_tokens: 6000,
    system,
    // Grading against an explicit written rubric is classification, not open-ended reasoning -
    // low effort keeps thinking from eating the whole max_tokens budget (it did, at the old
    // default-effort combo: stop_reason came back "max_tokens" with zero text). See review.py.
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content }],
  };
  if (structured) kwargs.output_config.format = { type: 'json_schema', schema: scalpSchema() };

  let msg;
  try {
    msg = await client.messages.create(kwargs);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 400 });
  }

  const raw = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  if (!structured) return new Response(JSON.stringify({ text: raw, gates: null, proposed: null }), { headers: { 'content-type': 'application/json' } });

  let data;
  try { data = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ error: 'Claude returned malformed structured output.' }), { status: 502 });
  }
  return new Response(JSON.stringify({ text: data.narrative, gates: data.gates, proposed: data.proposed }), { headers: { 'content-type': 'application/json' } });
}
