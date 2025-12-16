import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, Lock } from 'lucide-react';
import { AdminPanel } from '@/components/AdminPanel';
import { AppData } from '@/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { loadDataFromSupabase } from '@/lib/supabaseStorage';
import { getAppBaseUrl, isValidAppUrl } from '@/utils/appUrl';

const Admin = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [data, setData] = useState<AppData | null>(null);
  const [userSlug, setUserSlug] = useState<string>('');
  const [bakeryId, setBakeryId] = useState<string>('');
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(true);

  // Apply theme colors - call hook at top level
  useThemeColors(data?.settings || {} as any);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Check authentication status
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        
        if (!session) {
          setIsCheckingAuth(false);
          // Se não há usuário e há slug, redirecionar para login
          if (slug) {
            navigate('/admin');
          }
          return;
        }
        
        // ADICIONAR TIMEOUT DE 10 SEGUNDOS:
        timeoutId = setTimeout(() => {
          console.log('⏱️ Timeout de 10s - redirecionando para login');
          setIsCheckingAuth(false);
          navigate('/login');
        }, 10000);
        
        // Carregar com timeout forçado
        const loadPromise = loadUserData(session.user.id, slug);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 10000);
        });

        try {
          await Promise.race([loadPromise, timeoutPromise]);
          // Sucesso - cancelar timeout do redirecionamento
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        } catch (err) {
          // Timeout ou erro - o timeoutId já vai redirecionar
          console.log('⏱️ Erro ou timeout ao carregar');
        }
        setIsCheckingAuth(false);
        
      } catch (error) {
        console.error('Erro:', error);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        setIsCheckingAuth(false);
        navigate('/login');
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      
      if (session?.user) {
        await loadUserData(session.user.id, slug);
      } else {
        setData(null);
        setHasAccess(false);
      }
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, [slug, navigate]);

  // Timeout de segurança: após 10 segundos, se ainda estiver em loading ou sem dados, redirecionar para login
  useEffect(() => {
    // Só criar timeout se estiver em condições de loading ou sem dados
    if (isCheckingAuth || (user && (!data || !hasAccess))) {
      const safetyTimeout = setTimeout(() => {
        // Verificar valores atuais no momento da execução
        if (isCheckingAuth || (user && (!data || !hasAccess))) {
          navigate('/admin', { replace: true });
        }
      }, 10000);

      return () => clearTimeout(safetyTimeout);
    }
  }, [isCheckingAuth, user, data, hasAccess, navigate]);

  const loadUserData = async (userId: string, slug?: string) => {
    try {
      console.log('📥 Carregando dados do usuário...', { userId, slugFromUrl: slug });
      
      // Se há slug na URL, verificar se o usuário tem acesso a essa confeitaria
      let bakery;
      if (slug) {
        const { data: bakeryData, error: bakeryError } = await supabase
          .from('bakeries')
          .select('*')
          .eq('slug', slug)
          .eq('user_id', userId)
          .maybeSingle();

        if (bakeryError) {
          console.error('❌ Erro ao buscar bakery:', bakeryError);
          setIsCheckingAuth(false);
          setHasAccess(false);
          toast({
            title: 'Erro',
            description: 'Não foi possível carregar dados da confeitaria',
            variant: 'destructive',
          });
          return;
        }

        if (!bakeryData) {
          console.warn('⚠️ Acesso negado: usuário não é dono desta confeitaria');
          setIsCheckingAuth(false);
          setHasAccess(false);
          toast({
            title: 'Acesso negado',
            description: 'Você não tem permissão para acessar este painel',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }
        
        bakery = bakeryData;
      } else {
        // Se não há slug na URL, buscar a confeitaria do usuário
        const { data: bakeryData, error: bakeryError } = await supabase
          .from('bakeries')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (bakeryError) {
          console.error('❌ Erro ao buscar bakery:', bakeryError);
          setIsCheckingAuth(false);
          setHasAccess(false);
          toast({
            title: 'Erro',
            description: 'Não foi possível carregar dados da confeitaria',
            variant: 'destructive',
          });
          return;
        }

        if (!bakeryData) {
          console.warn('⚠️ Confeitaria não encontrada para o usuário');
          setIsCheckingAuth(false);
          setHasAccess(false);
          toast({
            title: 'Confeitaria não encontrada',
            description: 'Por favor, complete o cadastro',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }
        
        bakery = bakeryData;
        // Redirecionar para /:slug/admin apenas se não estamos já nessa rota
        if (window.location.pathname !== `/${bakery.slug}/admin`) {
          navigate(`/${bakery.slug}/admin`, { replace: true });
        }
        return;
      }

      console.log('✅ Bakery encontrada:', bakery);
      setUserSlug(bakery.slug);
      setBakeryId(bakery.id);
      setHasAccess(true);

      // Carregar dados completos do Supabase
      const appData = await loadDataFromSupabase(bakery.id);
      
      if (appData) {
        console.log('✅ Dados carregados com sucesso:', appData);
        setData(appData);
      } else {
        console.warn('⚠️ Nenhum dado encontrado, usando dados padrão');
        // Se não houver dados, criar estrutura padrão
        const defaultAppData: AppData = {
          settings: {
            brandName: bakery.confectionery_name,
            showLogo: false,
            showName: true,
            showHeroLogo: false,
            heroImagePosition: 'center',
            heroOverlayColor: '#000000',
            heroOverlayOpacity: 0.5,
            heroTitle: `Bem-vindo à ${bakery.confectionery_name}`,
            heroSubtitle: 'Doces artesanais feitos com carinho',
            whatsappNumber: '',
            whatsappMessage: 'Olá! Gostaria de fazer um pedido:',
            aboutTitle: 'Sobre Nós',
            aboutText: 'Somos uma confeitaria artesanal dedicada a criar doces deliciosos.',
            showAbout: true,
            extraInfoTitle: 'Informações Importantes',
            extraInfoText: 'Faça seu pedido com antecedência!',
            showExtraInfo: true,
            footerText: `© ${new Date().getFullYear()} ${bakery.confectionery_name}. Todos os direitos reservados.`,
            adminPassword: '',
          },
          products: [],
          sections: [],
          extras: [],
          tags: [],
        };
        setData(defaultAppData);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados do usuário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seus dados',
        variant: 'destructive',
      });
    }
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: 'Erro ao fazer login',
          description: error.message === 'Invalid login credentials' 
            ? 'Email ou senha incorretos' 
            : error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao fazer login',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Digite seu e-mail",
        description: "Por favor, digite seu e-mail no campo acima para recuperar sua senha.",
        variant: "destructive",
      });
      return;
    }

    const baseUrl = getAppBaseUrl();
    const redirectTo = `${baseUrl}/reset-password`;
    
    // Validar URL antes de usar
    if (!isValidAppUrl(redirectTo)) {
      toast({
        title: "Erro de segurança",
        description: "URL de redirecionamento inválida. Entre em contato com o suporte.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    });

    if (error) {
      toast({
        title: "Erro ao enviar e-mail",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "E-mail enviado!",
        description: "Enviamos um link de redefinição para o seu e-mail.",
      });
    }
  };

  const handleLogout = async () => {
    try {
      // 1. Encerrar sessão do Supabase
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('❌ Erro ao fazer logout:', signOutError);
        toast({
          title: 'Erro ao sair',
          description: 'Não foi possível encerrar a sessão. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      // 2. Limpar localStorage relacionado ao Supabase (storageKey exclusiva)
      const STORAGE_KEY = 'caseiros-cardapio-digital-supabase';
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.warn('⚠️ Erro ao limpar localStorage:', e);
      }

      // 3. Limpar estados locais do componente
      setUser(null);
      setData(null);
      setUserSlug('');
      setBakeryId('');
      setHasAccess(false);
      setEmail('');
      setPassword('');
      setIsDirty(false);
      setIsSaving(false);

      // 4. Mostrar notificação de sucesso
      toast({
        title: 'Sessão encerrada',
        description: 'Você saiu do painel administrativo.',
      });

      // 5. Redirecionar para a página de login
      // Usar replace para evitar voltar ao admin com back button
      navigate('/admin', { replace: true });
    } catch (error) {
      console.error('❌ Erro inesperado no logout:', error);
      toast({
        title: 'Erro ao sair',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleViewSiteAndLogout = async () => {
    // 1. Abrir o site público em nova aba (não depende de sessão autenticada)
    if (userSlug) {
      window.open(`/${userSlug}`, '_blank');
    }

    // 2. Reaproveitar a lógica de logout existente para encerrar sessão e redirecionar
    await handleLogout();
  };

  const handleDataChange = async (newData: AppData) => {
    setData(newData);
    setIsDirty(true);
  };

  // Autosave com debounce baseado em mudanças nos dados
  useEffect(() => {
    if (!data || !bakeryId) return;

    // Não disparar autosave se dados acabaram de ser carregados e ainda não foram modificados
    if (!isDirty) return;

    // Não rodar autosave se estiver desativado (ex: após falha)
    if (!isAutosaveEnabled) return;

    const timeout = setTimeout(async () => {
      try {
        // Evitar chamadas concorrentes
        if (isSaving) return;

        setIsSaving(true);
        console.log('💾 Autosave iniciando para bakeryId:', bakeryId);

        const { saveDataToSupabase } = await import('@/lib/supabaseStorage');
        const saved = await saveDataToSupabase(data, bakeryId);

        if (!saved) {
          console.error('❌ Autosave falhou');
          // Desativar autosave até um salvamento manual bem-sucedido
          setIsAutosaveEnabled(false);
          return;
        }

        setIsDirty(false);
        setLastSavedAt(new Date());
        console.log('✅ Autosave concluído com sucesso');
      } catch (error) {
        console.error('❌ Erro inesperado no autosave:', error);
        // Desativar autosave até um salvamento manual bem-sucedido
        setIsAutosaveEnabled(false);
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [data, bakeryId, isDirty, isSaving, isAutosaveEnabled]);

  const handleCloseAdmin = () => {
    if (userSlug) {
      navigate(`/${userSlug}`);
    } else {
      navigate('/');
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <div className="max-w-md w-full bg-card border rounded-lg p-8 shadow-lg">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary/10 p-3 rounded-full">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          
          <h1 className="text-2xl font-display font-bold text-center mb-2">
            Painel Administrativo
          </h1>
          <p className="text-center text-muted-foreground mb-6">
            Faça login para gerenciar sua confeitaria
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                disabled={isLoading}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-primary hover:underline text-center w-full"
              disabled={isLoading}
            >
              Esqueci minha senha
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-sm text-primary hover:underline"
                disabled={isLoading}
              >
                Criar uma conta
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!data || !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminPanel
      isOpen={true}
      onClose={handleCloseAdmin}
      data={data}
      onDataChange={handleDataChange}
      onLogout={handleLogout}
      userSlug={userSlug}
      bakeryId={bakeryId}
      onViewSite={handleViewSiteAndLogout}
      onManualSaveStart={() => {
        // Bloquear autosave enquanto o salvamento manual estiver em andamento
        setIsSaving(true);
      }}
      onManualSaveEnd={(success) => {
        // Liberar novamente após o término do salvamento manual
        setIsSaving(false);

        if (success) {
          // Reabilitar autosave e limpar estado de sujeira/último salvamento
          setIsAutosaveEnabled(true);
          setIsDirty(false);
          setLastSavedAt(new Date());
        }
      }}
    />
  );
};

export default Admin;
