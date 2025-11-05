import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente do Supabase não encontradas. ' +
    'Certifique-se de que VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas no arquivo .env.local'
  );
}

// StorageKey exclusiva para este projeto para evitar conflitos com outros apps no mesmo domínio
const STORAGE_KEY = 'caseiros-cardapio-digital-supabase';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
