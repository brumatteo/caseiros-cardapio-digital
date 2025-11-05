import { createClient } from '@supabase/supabase-js';

const supabasePlanoUrl = import.meta.env.VITE_SUPABASE_PLANO_URL as string;
const supabasePlanoAnonKey = import.meta.env.VITE_SUPABASE_PLANO_ANON_KEY as string;

export const supabasePlanoClient = createClient(supabasePlanoUrl, supabasePlanoAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'plano-read-only',
  },
  global: {
    headers: {
      'x-client-info': 'cardapio-plano-validator',
    },
  },
});


