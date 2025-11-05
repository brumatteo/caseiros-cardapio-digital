export function getAppBaseUrl() {
  // Usa variável de ambiente se existir; senão, cai para window.location.origin
  const fromEnv = import.meta.env.VITE_APP_URL as string | undefined;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'http://localhost:5173';
}

