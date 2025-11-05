import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, Lock } from 'lucide-react';
import { AdminPanel } from '@/components/AdminPanel';
import { AppData } from '@/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { loadDataFromSupabase } from '@/lib/supabaseStorage';
import { validateEmailInSupabasePlano } from '@/lib/validateEmailPlano';

const Admin = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [data, setData] = useState<AppData | null>(null);
  const [userSlug, setUserSlug] = useState<string>('');
  const [bakeryId, setBakeryId] = useState<string>('');
  const [hasAccess, setHasAccess] = useState<boolean>(false);

  // Apply theme colors - call hook at top level
  useThemeColors(data?.settings || {} as any);

  useEffect(() => {
    const bootstrap = async () => {
      // 1) Auto-login via ?email=
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      if (emailParam) {
        const decoded = decodeURIComponent(emailParam);
        const ok = await validateEmailInSupabasePlano(decoded);
        if (ok) {
          localStorage.setItem('cardapio_auth_email', decoded.trim().toLowerCase());
          // limpar param da URL
          const url = new URL(window.location.href);
          url.searchParams.delete('email');
          window.history.replaceState({}, '', url.toString());
          setHasAccess(true);
        } else {
          toast({
            title: 'E-mail não cadastrado',
            description: 'Faça seu cadastro pelo seu Plano de Ação Interativo.',
            variant: 'destructive',
          });
          setHasAccess(false);
        }
        setIsCheckingAuth(false);
        return;
      }

      // 2) Sessão local
      const saved = localStorage.getItem('cardapio_auth_email');
      if (saved) {
        setHasAccess(true);
        setIsCheckingAuth(false);
        return;
      }

      setIsCheckingAuth(false);
    };

    bootstrap();
  }, [slug, navigate]);

  const loadUserData = async () => {
    try {
      console.log('📥 Carregando dados para admin...', { slugFromUrl: slug });
      
      // Carregar bakery pelo slug (admin acessa sua própria loja pela URL)
      let bakery;
      if (slug) {
        const { data: bakeryData, error: bakeryError } = await supabase
          .from('bakeries')
          .select('*')
          .eq('slug', slug)
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
          console.warn('⚠️ Confeitaria não encontrada');
          setIsCheckingAuth(false);
          setHasAccess(false);
          toast({
            title: 'Confeitaria não encontrada',
            description: 'Verifique o endereço /:slug/admin',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }
        
        bakery = bakeryData;
      } else {
        // Requer slug para acessar admin
        toast({
          title: 'Endereço inválido',
          description: 'Acesse o painel via /:slug/admin',
          variant: 'destructive',
        });
        navigate('/');
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
    const ok = await validateEmailInSupabasePlano(email);
    if (ok) {
      localStorage.setItem('cardapio_auth_email', email.trim().toLowerCase());
      setHasAccess(true);
      if (slug) {
        await loadUserData();
      }
    } else {
      toast({
        title: 'E-mail não cadastrado',
        description: 'Faça seu cadastro pelo seu Plano de Ação Interativo.',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    localStorage.removeItem('cardapio_auth_email');
    toast({
      title: 'Sessão encerrada',
      description: 'Você saiu do painel administrativo.',
    });
    navigate('/');
  };

  const handleDataChange = async (newData: AppData) => {
    setData(newData);
  };

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

  if (!hasAccess) {
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                'Acessar'
              )}
            </Button>
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
    />
  );
};

export default Admin;
