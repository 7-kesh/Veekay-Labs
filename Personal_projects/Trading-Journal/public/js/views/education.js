// Education backlog: a plain to-do list of things to study; tick one off when it is done.
import { listEducation, addEducation, setEducationDone, deleteEducation } from '../db.js';
import { esc } from '../format.js';

export async function render(_params, el) {
  let items = [], err = '';
  try { items = await listEducation(); } catch (e) { err = e.message || String(e); }
  const open = items.filter(i => !i.done), done = items.filter(i => i.done);
  const row = i => `<li><label><input type="checkbox" data-id="${i.id}" ${i.done ? 'checked' : ''}>
    <span class="${i.done ? 'muted' : ''}" style="${i.done ? 'text-decoration:line-through' : ''}">${esc(i.text)}</span></label>
    ${i.done ? `<small class="muted">done ${esc(i.done_on || '')}</small>` : ''}
    <button class="btn sm" type="button" data-del="${i.id}" title="Remove">✕</button></li>`;

  el.innerHTML = `
    <div class="head"><h1>Education backlog <small>${open.length} to do · ${done.length} done</small></h1></div>
    ${err ? `<p class="neg">${esc(err)} - run <code>supabase/migrate-areas.sql</code> in the Supabase SQL editor.</p>` : ''}
    <section class="card">
      <form id="addForm" style="display:flex;gap:8px;margin-bottom:12px">
        <input name="text" placeholder="Add something to learn, e.g. Read about IV rank and skew" required style="flex:1">
        <button class="btn primary" type="submit">Add</button></form>
      <ul class="edulist">${open.map(row).join('') || '<li class="muted">Nothing on the list. Add your first item above.</li>'}</ul>
    </section>
    ${done.length ? `<section class="card" style="margin-top:16px"><h2>Done</h2><ul class="edulist">${done.map(row).join('')}</ul></section>` : ''}`;

  el.querySelector('#addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = e.target.text.value.trim();
    if (t) { await addEducation(t); await render({}, el); }
  });
  el.querySelectorAll('input[data-id]').forEach(c => c.addEventListener('change', async () => {
    await setEducationDone(Number(c.dataset.id), c.checked); await render({}, el);
  }));
  el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    await deleteEducation(Number(b.dataset.del)); await render({}, el);
  }));
}
