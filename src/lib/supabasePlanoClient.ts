import { createClient } from '@supabase/supabase-js';

const supabasePlano = createClient(
  import.meta.env.VITE_SUPABASE_URL_PLANO as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY_PLANO as string
);

export default supabasePlano;


