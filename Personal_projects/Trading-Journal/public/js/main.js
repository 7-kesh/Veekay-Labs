import { getSession, signIn, signOut, onAuthChange } from './auth.js';
import { ensureSettings, purgeOldScreenshots } from './db.js';
import { seedIfEmpty as seedStrategyIfEmpty } from './strategy.js';
import { register, mount, dispatch, navigate } from './router.js';
import * as today from './views/today.js';
import * as scalpList from './views/scalp-list.js';
import * as scalpForm from './views/scalp-form.js';
import * as strategyView from './views/strategy.js';
import * as weeklyView from './views/weekly.js';

const app = document.getElementById('app');
const loginScreen = document.getElementById('loginScreen');
const shell = document.getElementById('shell');
const userEmailEl = document.getElementById('userEmail');

register('today', today.render);
register('scalp', scalpList.render);
register('scalp/:id', scalpForm.render);
register('strategy', strategyView.render);
register('weekly', weeklyView.render);

mount(app);

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const err = document.getElementById('loginError');
  err.textContent = '';
  try {
    await signIn(form.email.value.trim(), form.password.value);
  } catch (ex) {
    err.textContent = ex.message || 'Could not sign in.';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut();
});

async function showAuthed(session) {
  loginScreen.hidden = true;
  shell.hidden = false;
  userEmailEl.textContent = session.user.email || '';
  await ensureSettings();
  await seedStrategyIfEmpty();
  purgeOldScreenshots().catch(err => console.error('screenshot purge failed', err));
  if (!window.location.hash) navigate('today');
  dispatch();
}

function showLogin() {
  shell.hidden = true;
  loginScreen.hidden = false;
}

onAuthChange((session) => { session ? showAuthed(session) : showLogin(); });
const initial = await getSession();
if (initial) await showAuthed(initial); else showLogin();
