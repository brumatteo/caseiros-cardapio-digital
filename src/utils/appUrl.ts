/**
 * Retorna a URL base do aplicativo com validação de segurança
 * Prioriza variável de ambiente, valida domínio e previne redirects maliciosos
 */
export function getAppBaseUrl(): string {
  // Prioridade 1: Variável de ambiente (configurada no deploy)
  const fromEnv = import.meta.env.VITE_APP_URL as string | undefined;
  if (fromEnv && fromEnv.trim().length > 0) {
    const url = fromEnv.trim();
    // Validar formato básico da URL
    try {
      const parsed = new URL(url);
      // Garantir que é http ou https
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return url;
      }
    } catch {
      // URL inválida, continuar para próximas opções
    }
  }

  // Prioridade 2: window.location.origin (apenas em runtime browser)
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    // Validar que é um domínio válido (não file://, blob:, etc)
    try {
      const parsed = new URL(origin);
      if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname) {
        return origin;
      }
    } catch {
      // Origin inválido
    }
  }

  // Fallback: apenas em desenvolvimento
  return 'http://localhost:5173';
}

/**
 * Valida se uma URL pertence ao domínio permitido do app
 * Previne redirects para domínios externos não autorizados
 */
export function isValidAppUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const appBaseUrl = getAppBaseUrl();
    const appParsed = new URL(appBaseUrl);

    // Verificar se o protocolo é seguro
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // Verificar se o domínio corresponde ao domínio do app
    // Permite o mesmo hostname e subdomínios do mesmo domínio base
    const appHostname = appParsed.hostname;
    const urlHostname = parsed.hostname;

    // Match exato ou subdomínio
    if (urlHostname === appHostname || urlHostname.endsWith('.' + appHostname)) {
      return true;
    }

    // Em desenvolvimento local, permitir localhost com qualquer porta
    if (appHostname === 'localhost' && urlHostname === 'localhost') {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

