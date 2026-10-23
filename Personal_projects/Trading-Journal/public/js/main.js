import { signIn, signOut, onAuthChange } from './auth.js';
import { ensureSettings, purgeOldScreenshots } from './db.js';
import { seedIfEmpty as seedStrategyIfEmpty } from './strategy.js';
import { register, mount, dispatch, navigate } from './router.js';
import * as today from './views/today.js';
import * as scalpList from './views/scalp-list.js';
import * as scalpForm from './views/scalp-form.js';
import * as strategyView from './views/strategy.js';
import * as weeklyView from './views/weekly.js';
import * as settingsView from './views/settings.js';
import * as planList from './views/plan-list.js';
import * as planForm from './views/plan-form.js';
import * as statsKind from './views/stats-kind.js';
import * as statsPortfolio from './views/stats-portfolio.js';

const app = document.getElementById('app');
const loginScreen = document.getElementById('loginScreen');
const shell = document.getElementById('shell');
const userEmailEl = document.getElementById('userEmail');

register('today', today.render);
register('scalp', scalpList.render);
register('scalp/:id', scalpForm.render);
register('strategy', strategyView.render);
register('weekly', weeklyView.render);
register('settings', settingsView.render);
register('options', (p, el) => planList.render('options', p, el));
register('options/:id', (p, el) => planForm.render('options', p, el));
register('swing', (p, el) => planList.render('swing', p, el));
register('swing/:id', (p, el) => planForm.render('swing', p, el));
register('stats', async (p, el) => { navigate('stats/portfolio'); await dispatch(); });
register('stats/portfolio', statsPortfolio.render);
register('stats/scalp', (p, el) => statsKind.render('scalp', p, el));
register('stats/options', (p, el) => statsKind.render('options', p, el));
register('stats/swing', (p, el) => statsKind.render('swing', p, el));

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

let authedUserId = null; // tracks whether we've already set up the app for this signed-in user

async function showAuthed(session) {
  loginScreen.hidden = true;
  shell.hidden = false;
  userEmailEl.textContent = session.user.email || '';
  userEmailEl.title = session.user.email || '';
  await ensureSettings();
  await seedStrategyIfEmpty();
  purgeOldScreenshots().catch(err => console.error('screenshot purge failed', err));
  if (!window.location.hash) navigate('today');
  dispatch();
}

function showLogin() {
  authedUserId = null;
  shell.hidden = true;
  loginScreen.hidden = false;
}

// Supabase fires onAuthStateChange for background events too (TOKEN_REFRESHED, USER_UPDATED,
// a repeated INITIAL_SESSION) - re-rendering the app on every one of those would wipe whatever
// the user is in the middle of typing. showAuthed() (which re-fetches data and re-dispatches
// the router) only runs for an actual new sign-in; showLogin() is cheap/idempotent so it's
// always safe to call whenever there's no session, including on first load.
onAuthChange((session) => {
  if (session) {
    if (session.user.id !== authedUserId) { authedUserId = session.user.id; showAuthed(session); }
  } else {
    showLogin();
  }
});
