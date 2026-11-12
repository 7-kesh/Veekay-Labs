import { supabase } from '../supabase-client.js';
import { esc } from '../format.js';
import { downloadText } from '../download.js';

const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPTED = new Set(['.csv','.tsv','.txt','.json','.xlsx','.xls','.pdf','.png','.jpg','.jpeg','.webp']);
function extOf(name) { return (name.match(/\.[^.]+$/)?.[0] || '').toLowerCase(); }
function asDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}
async function extractWorkbook(file) {
  if (!window.XLSX) throw new Error('Excel support did not load. Refresh the page or export the workbook as CSV.');
  const workbook = window.XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  return workbook.SheetNames.map(name => 'SHEET: ' + name + '\n' + window.XLSX.utils.sheet_to_csv(workbook.Sheets[name])).join('\n\n').slice(0, 180000);
}
function renderTrades(trades) {
  if (!trades.length) return '<p class="muted">No trade rows were confidently extracted. Try a broker tradebook or contract note with clearer headers.</p>';
  const cols = ['date','symbol','trade_type','side','quantity','entry_price','exit_price','net_pnl','fees','confidence'];
  return '<div class="tablewrap"><table><thead><tr>' + cols.map(c => '<th>' + c.replaceAll('_',' ') + '</th>').join('') +
    '</tr></thead><tbody>' + trades.map(t => '<tr>' + cols.map(c => '<td>' + esc(t[c] ?? '—') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
}
export async function render(_params, el) {
  el.innerHTML = '<div class="head"><h1>KeshavTrades AI Import <small>Upload broker exports, statements or screenshots</small></h1></div>' +
    '<section class="card"><h2>Import trading data</h2>' +
    '<p class="muted">Upload a Zerodha, Groww or generic broker CSV/Excel export, PDF statement, or trade screenshot. OpenAI extracts a structured preview; nothing is added to your trading statistics until you review and save the import batch.</p>' +
    '<form id="aiImportForm"><div class="cells">' +
    '<div class="fld f-md"><label for="broker">Broker</label><select id="broker"><option>Auto-detect</option><option>Zerodha</option><option>Groww</option><option>Other</option></select></div>' +
    '<div class="fld f-md"><label for="account">Account type</label><select id="account"><option value="live">Live</option><option value="paper">Paper</option></select></div>' +
    '<div class="fld f-fill"><label for="tradeFile">File</label><input id="tradeFile" type="file" accept=".csv,.tsv,.txt,.json,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp" required></div>' +
    '</div><p class="muted note">Maximum file size: 12 MB. Excel workbooks are read in your browser; PDF and image contents are sent to the secured AI endpoint.</p>' +
    '<div class="actions"><button class="btn primary" id="analyzeBtn" type="submit">Analyse upload with AI</button><span class="muted" id="status" role="status"></span></div></form></section>' +
    '<section class="card" id="aiPreview" hidden><div class="head"><h2>Extraction preview</h2><div class="actions"><button class="btn" id="downloadJson" type="button">Download JSON</button><button class="btn primary" id="saveBatch" type="button">Save import batch</button></div></div>' +
    '<div id="aiSummary"></div><div id="aiInsights"></div><div id="aiWarnings"></div><div id="aiTrades"></div>' +
    '<p class="muted note">AI extraction can misread quantities, prices, fees or trade direction. Verify the original broker statement before using these records for performance or tax decisions.</p><span class="muted" id="saveStatus"></span></section>';

  const form = el.querySelector('#aiImportForm'), fileInput = el.querySelector('#tradeFile');
  const status = el.querySelector('#status'), preview = el.querySelector('#aiPreview');
  let latest = null, latestFile = null;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (file.size > MAX_BYTES) { status.textContent = 'File exceeds the 12 MB limit.'; return; }
    const ext = extOf(file.name);
    if (!ACCEPTED.has(ext)) { status.textContent = 'Unsupported file type.'; return; }
    const btn = el.querySelector('#analyzeBtn');
    btn.disabled = true; status.textContent = 'Preparing file…'; preview.hidden = true;
    try {
      const sessionResult = await supabase.auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      if (!sessionResult.data.session) throw new Error('Your session expired. Please sign in again.');
      const payload = { filename:file.name, mimeType:file.type || 'application/octet-stream', broker:el.querySelector('#broker').value, account:el.querySelector('#account').value };
      if (ext === '.xlsx' || ext === '.xls') {
        payload.contentType = 'text'; payload.text = await extractWorkbook(file);
      } else if (['.csv','.tsv','.txt','.json'].includes(ext)) {
        payload.contentType = 'text'; payload.text = (await file.text()).slice(0, 180000);
      } else {
        payload.contentType = ext === '.pdf' ? 'pdf' : 'image'; payload.dataUrl = await asDataUrl(file);
      }
      status.textContent = 'Analysing with OpenAI…';
      const { data, error } = await supabase.functions.invoke('ai-import', { body: payload });
      if (error) {
        let message = error.message || 'AI extraction failed.';
        if (error.context instanceof Response) {
          const detail = await error.context.json().catch(() => ({}));
          if (detail.error) message = detail.error;
        }
        throw new Error(message);
      }
      latest = data && data.result; latestFile = file;
      if (!latest || !Array.isArray(latest.trades)) throw new Error('The AI response did not contain a valid trades array.');
      el.querySelector('#aiSummary').innerHTML = '<h3>Summary</h3><p>' + esc(latest.summary || 'No summary supplied.') + '</p>';
      el.querySelector('#aiInsights').innerHTML = (latest.insights || []).length ? '<h3>AI observations</h3><ul>' + latest.insights.map(w => '<li>' + esc(w) + '</li>').join('') + '</ul>' : '';
      el.querySelector('#aiWarnings').innerHTML = (latest.warnings || []).length ? '<h3>Warnings</h3><ul class="neg">' + latest.warnings.map(w => '<li>' + esc(w) + '</li>').join('') + '</ul>' : '';
      el.querySelector('#aiTrades').innerHTML = '<h3>Extracted trades (' + latest.trades.length + ')</h3>' + renderTrades(latest.trades);
      preview.hidden = false; status.textContent = 'Extraction complete. Review the records below.';
    } catch (err) { status.textContent = err.message || String(err); }
    finally { btn.disabled = false; }
  });
  el.querySelector('#downloadJson').addEventListener('click', () => {
    if (latest) downloadText('keshavtrades-import-' + new Date().toISOString().slice(0,10) + '.json', JSON.stringify(latest,null,2), 'application/json');
  });
  el.querySelector('#saveBatch').addEventListener('click', async e => {
    if (!latest || !latestFile) return;
    const btn = e.currentTarget, msg = el.querySelector('#saveStatus');
    btn.disabled = true; msg.textContent = 'Saving…';
    try {
      const result = await supabase.from('ai_import_batches').insert({
        filename:latestFile.name, broker:el.querySelector('#broker').value, account:el.querySelector('#account').value,
        file_type:extOf(latestFile.name).slice(1), summary:latest.summary || '', extracted:latest
      }).select('id').single();
      if (result.error) throw result.error;
      const account = el.querySelector('#account').value;
      const valid = latest.trades.filter(t => t.date && t.symbol && Number(t.quantity) > 0 &&
        Number.isFinite(Number(t.entry_price)) && Number.isFinite(Number(t.exit_price)) &&
        ['high','medium'].includes(t.confidence) && ['intraday','scalp','options','swing'].includes(t.trade_type));
      let imported = 0, skipped = latest.trades.length - valid.length;
      for (const t of valid) {
        const ticker = String(t.symbol).trim().toUpperCase();
        const date = String(t.date).slice(0,10);
        const common = { ticker, account, date };
        if (t.trade_type === 'swing' || t.trade_type === 'options') {
          const kind = t.trade_type;
          const dup = await supabase.from('plans').select('id').eq('kind',kind).eq('ticker',ticker)
            .eq('account',account).eq('plan_date',date).eq('actual_entry',Number(t.entry_price))
            .eq('actual_exit',Number(t.exit_price)).eq('qty',Number(t.quantity)).limit(1);
          if (dup.error) throw dup.error;
          if (dup.data.length) { skipped++; continue; }
          const ins = await supabase.from('plans').insert({
            kind, account, ticker, status:'closed', plan_date:date, entry_date:date, exit_date:date,
            direction:t.side === 'short' || t.side === 'sell' ? 'short' : 'long',
            actual_entry:Number(t.entry_price), actual_exit:Number(t.exit_price), qty:Number(t.quantity),
            realized_pl:t.net_pnl == null ? null : Number(t.net_pnl), fees:Number(t.fees || 0),
            notes:'Imported from ' + latestFile.name + (t.notes ? ' — ' + t.notes : '')
          });
          if (ins.error) throw ins.error;
        } else {
          const dup = await supabase.from('scalp_trades').select('id').eq('date',date).eq('ticker',ticker)
            .eq('account',account).eq('entry_price',Number(t.entry_price)).eq('avg_exit',Number(t.exit_price))
            .eq('shares',Number(t.quantity)).limit(1);
          if (dup.error) throw dup.error;
          if (dup.data.length) { skipped++; continue; }
          const ins = await supabase.from('scalp_trades').insert({
            ...common, entry_price:Number(t.entry_price), avg_exit:Number(t.exit_price),
            shares:Number(t.quantity), net_pnl:t.net_pnl == null ? null : Number(t.net_pnl),
            commission:Number(t.fees || 0), review_status:'draft',
            notes:'Imported from ' + latestFile.name + (t.notes ? ' — ' + t.notes : '')
          });
          if (ins.error) throw ins.error;
        }
        imported++;
      }
      msg.textContent = 'Import batch #' + result.data.id + ' saved. Added ' + imported +
        ' trade(s) to your journal; skipped ' + skipped + ' duplicate, uncertain or incomplete row(s). Check Intraday / Swing and Graphs.';
    } catch (err) {
      msg.textContent = 'Could not save: ' + (err.message || String(err)) + '. Check that the ai_import_batches migration has been run.';
      btn.disabled = false;
    }
  });
}
