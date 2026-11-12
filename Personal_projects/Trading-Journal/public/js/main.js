import { signIn, signOut, onAuthChange } from './auth.js';
import { ensureSettings, purgeOldScreenshots } from './db.js';
import { seedIfEmpty as seedStrategyIfEmpty } from './strategy.js';
import { register, mount, dispatch, navigate } from './router.js';
import { installNumberAutocorrect } from './numeric.js';
import { installChipKeys } from './keynav.js';
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
import * as analyticsView from './views/analytics.js';
import * as portfolioRemindersView from './views/portfolio-reminders.js';
import * as graphsView from './views/graphs.js';
import * as wrapupImport from './views/wrapup-import.js';
import * as journalView from './views/journal.js';
import * as journalEntryView from './views/journal-entry.js';
import * as improvementsView from './views/improvements.js';
import * as educationView from './views/education.js';
import * as aiImportView from './views/ai-import.js';
import * as intradayView from './views/intraday.js';
import * as assetsView from './views/assets.js';

const app = document.getElementById('app');
const loginScreen = document.getElementById('loginScreen');
const shell = document.getElementById('shell');
const userEmailEl = document.getElementById('userEmail');

register('today', today.render);
register('intraday', intradayView.render);
register('intraday/trades', scalpList.render);
register('intraday/trades/:id', scalpForm.render);
register('strategy', strategyView.render);
register('weekly', weeklyView.render);
register('settings', settingsView.render);
register('import', wrapupImport.render);
register('journal', journalView.render);
register('journal/:date', journalEntryView.render);
register('improvements', improvementsView.render);
register('education', educationView.render);
register('ai-import', aiImportView.render);
register('intraday/plans', (p, el) => planList.render('options', p, el));
register('intraday/plans/:id', (p, el) => planForm.render('options', p, el));
register('swing', (p, el) => planList.render('swing', p, el));
register('investing', (p, el) => assetsView.renderAssetClass('equity', p, el));
register('funds', (p, el) => assetsView.renderAssetClass('mutual_fund', p, el));
register('etfs', (p, el) => assetsView.renderAssetClass('etf', p, el));
register('swing/:id', (p, el) => planForm.render('swing', p, el));
register('stats', async (p, el) => { navigate('stats/portfolio'); await dispatch(); });
register('stats/portfolio', analyticsView.render);
register('stats/portfolio/reminders', portfolioRemindersView.render);
register('graphs', graphsView.render);
register('stats/intraday', (p, el) => statsKind.render('scalp', p, el));
register('stats/swing', (p, el) => statsKind.render('swing', p, el));

mount(app);

// The sidebar's active item and section color follow the current workspace.
function updateChrome() {
  const path = (window.location.hash || '#/stats/portfolio').slice(2).split('?')[0];
  const first = path.split('/')[0];
  const sec = path.startsWith('stats/') ? path.split('/')[1] : first;
  document.body.className = ['intraday'].includes(sec) ? 'sec-intraday' : sec === 'swing' ? 'sec-swing' : sec === 'investing' ? 'sec-investing' : (sec === 'funds' || sec === 'etfs') ? 'sec-funds' : '';
  document.querySelectorAll('.side .sn[href]').forEach(a => {
    const target = a.getAttribute('href').slice(2);
    a.classList.toggle('on', path === target || path.startsWith(target + '/') || (target === 'funds' && path === 'etfs'));
  });
}
window.addEventListener('hashchange', updateChrome);

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

// Dark is the default; the choice is remembered in this browser only.
const themeBtn = document.getElementById('themeBtn');
const paintThemeBtn = () => { themeBtn.textContent = document.documentElement.dataset.theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'; };
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('tj-theme', next); } catch { /* private window: the choice just won't stick */ }
  paintThemeBtn();
});
paintThemeBtn();

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut();
});

let authedUserId = null; // tracks whether we've already set up the app for this signed-in user

async function showAuthed(session) {
  loginScreen.hidden = true;
  shell.hidden = false;
  userEmailEl.textContent = session.user.email || '';
  userEmailEl.title = session.user.email || '';
  await Promise.all([ensureSettings(), seedStrategyIfEmpty()]);
  purgeOldScreenshots().catch(err => console.error('screenshot purge failed', err));
  if (!window.location.hash) navigate('stats/portfolio');
  updateChrome();
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

installNumberAutocorrect();
installChipKeys(app);
