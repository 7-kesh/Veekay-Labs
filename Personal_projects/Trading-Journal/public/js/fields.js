// Shared form-field builders - port of app/templates/_macros.html's fld/yn/chips/acct_pick.
import { esc } from './format.js';

export function fld(name, label, value, cls, opts = {}) {
  const { type = 'text', mode = '', extra = '', hint = '' } = opts;
  return `<div class="fld ${cls}"><label for="i_${name}">${label}${hint ? ` <small>${hint}</small>` : ''}</label>
    <input id="i_${name}" type="${type}" name="${name}" value="${esc(value ?? '')}" ${mode ? `inputmode="${mode}"` : ''} ${extra}></div>`;
}

export function yn(name, value, label) {
  const opts = [['Y', 'Yes'], ['N', 'No'], ['', '–']];
  return `<div class="fld"><span class="lab">${label}</span><div class="seg yn" role="radiogroup" aria-label="${label}">
    ${opts.map(([v, t]) => `<label><input type="radio" name="${name}" value="${v}" ${(value || '') === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}
    </div></div>`;
}

export function chips(name, options, selected, tone = '') {
  return `<div class="chips ${tone}">${options.map(o =>
    `<label><input type="checkbox" name="${name}" value="${esc(o)}" ${selected.includes(o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`;
}

export function acctPick(value) {
  return `<div class="fld"><span class="lab">Account</span><div class="seg acct-seg" role="radiogroup" aria-label="Paper or live trade">
    <label><input type="radio" name="account" value="paper" ${(value || 'paper') !== 'live' ? 'checked' : ''}><span>Paper</span></label>
    <label><input type="radio" name="account" value="live" ${value === 'live' ? 'checked' : ''}><span>Live</span></label>
    </div></div>`;
}
