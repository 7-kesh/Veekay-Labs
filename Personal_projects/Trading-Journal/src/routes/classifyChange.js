// POST /api/classify-change - port of app/strategy.py's classify_change(). Asks Claude whether
// a proposed rule-wording change is looser/tighter/reversal/addition/definition - a judgment
// call, so it's the one part of strategy governance that costs tokens; closing/opening the
// versioned rule row and logging the change stay plain client-side code (public/js/strategy.js).
import Anthropic from '@anthropic-ai/sdk';
import { verifyUser, unauthorized } from '../lib/verifyUser.js';

export async function handleClassifyChange(request, env) {
  const user = await verifyUser(request, env);
  if (!user) return unauthorized();
  if (!env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured on this Worker.' }), { status: 500 });
  }

  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), { status: 400 }); }
  const { ruleKey, originalText, newText, model } = body;
  if (!ruleKey || !newText) return new Response(JSON.stringify({ error: 'Missing ruleKey or newText.' }), { status: 400 });

  const system = "You are checking whether Veekay's proposed wording changes a trading-strategy rule. "
    + "Any change to the strategy is a red flag by his own standing rule - say so plainly, "
    + "never soften it. Classify the effect as exactly one of: looser, tighter, reversal, "
    + 'addition, definition (a new rule where none existed before is "addition"; a change '
    + 'to the definition of a term used elsewhere is "definition").';

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  let msg;
  try {
    msg = await client.messages.create({
      model: model || 'claude-sonnet-5-5',
      max_tokens: 1000,
      system,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              effect: { type: 'string', enum: ['looser', 'tighter', 'reversal', 'addition', 'definition'] },
              explanation: { type: 'string', description: 'One or two sentences: what changed and why it matters.' },
            },
            required: ['effect', 'explanation'], additionalProperties: false,
          },
        },
      },
      messages: [{ role: 'user', content: `Rule: ${ruleKey}\n\nOriginal wording:\n${originalText || '(no prior rule - this is new)'}\n\nProposed wording:\n${newText}` }],
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 400 });
  }
  const raw = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  let data;
  try { data = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ error: 'Claude returned malformed structured output.' }), { status: 502 });
  }
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
}
