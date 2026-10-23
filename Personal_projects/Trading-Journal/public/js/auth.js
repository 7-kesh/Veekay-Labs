import { supabase } from './supabase-client.js';

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// event: 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | ...
// Pass the event through so callers can ignore background events like TOKEN_REFRESHED, which
// fire periodically and carry a (still-valid) session - reacting to them re-renders the whole
// app for no reason and looks like the page randomly refreshing itself.
export function onAuthChange(cb) {
  supabase.auth.onAuthStateChange((event, session) => cb(session, event));
}
