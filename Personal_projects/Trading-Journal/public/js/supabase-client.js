import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const cfg = window.TJ_CONFIG;
if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
  throw new Error('public/config.js is missing or incomplete (need supabaseUrl + supabaseAnonKey).');
}

export const supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
