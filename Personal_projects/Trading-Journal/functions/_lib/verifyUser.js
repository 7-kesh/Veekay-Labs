// Shared auth check for every Pages Function. The function never gets Supabase credentials
// beyond the public anon key - it just asks Supabase's auth server "is this access token
// valid, and whose is it", then checks the email against the one allow-listed account. The
// real data access control (RLS + is_veekay()) still lives in Postgres, same as every other
// write in this app; this is only a cheap gate to stop a stranger from burning the Anthropic
// API budget if they ever found this endpoint's URL.
// Same values as public/config.js (the anon key is meant to be public - see that file's comment).
const SUPABASE_URL = 'https://bnnkoambrwgeyzftokwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJubmtvYW1icndnZXl6ZnRva3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MjUzNjIsImV4cCI6MjEwODMwMTM2Mn0.NQP4jVj1kl6rllGSBdj0XC8MJjCQKR9K0FtQpI785dc';

export async function verifyUser(request, env) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  });
  if (!res.ok) return null;
  const user = await res.json();
  const allowed = (env.ALLOWED_EMAIL || '').toLowerCase();
  if (!allowed || (user.email || '').toLowerCase() !== allowed) return null;
  return user;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
}
