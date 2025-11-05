import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [confectioneryName, setConfectioneryName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confectioneryName.trim() || !email.trim() || !password.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter no mínimo 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const slug = generateSlug(confectioneryName);

    try {
      // Check if slug already exists
      const { data: existingBakery } = await supabase
        .from('bakeries')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();

      if (existingBakery) {
        toast({
          title: 'Erro',
          description: 'Já existe uma confeitaria com esse nome. Tente outro.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Sign up the user
      console.log('🔐 Criando usuário no Auth...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });

      if (authError) {
        console.error('❌ Erro no Auth:', authError);
        toast({
          title: 'Erro ao criar conta',
          description: authError.message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        console.error('❌ Usuário não foi criado');
        toast({
          title: 'Erro',
          description: 'Não foi possível criar a conta',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      console.log('✅ Usuário criado:', authData.user.id);

      // Create bakery record
      console.log('📝 Criando registro na tabela bakeries...');
      const { data: bakeryData, error: bakeryError } = await supabase
        .from('bakeries')
        .insert({
          user_id: authData.user.id,
          confectionery_name: confectioneryName,
          slug: slug,
          settings: {},
        })
        .select()
        .single();

      if (bakeryError) {
        console.error('❌ Erro ao criar bakery:', bakeryError);
        toast({
          title: 'Erro',
          description: 'Não foi possível criar a confeitaria',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      console.log('✅ Bakery criada:', bakeryData);

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Redirecionando para o painel administrativo...',
      });

      // Redirect to admin
      navigate(`/${slug}/admin`);
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao criar a conta',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="max-w-md w-full bg-card border rounded-lg p-8 shadow-lg">
        <h1 className="text-2xl font-display font-bold text-center mb-2">
          Seu cardápio começa aqui
        </h1>
        <p className="text-center text-muted-foreground mb-6">
          Crie seu espaço digital e mostre seus bolos e sabores com o seu toque especial.
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nome da Confeitaria</label>
            <Input
              type="text"
              value={confectioneryName}
              onChange={(e) => setConfectioneryName(e.target.value)}
              placeholder="Doces da Maria"
              disabled={isLoading}
              required
            />
          </div>

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
            <p className="text-xs text-muted-foreground mt-1">
              Use o mesmo e-mail cadastrado na Hotmart para garantir o acesso.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              disabled={isLoading}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando meu cardápio...
              </>
            ) : (
              'Criar meu cardápio'
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="text-sm text-primary hover:underline"
              disabled={isLoading}
            >
              Já tenho uma conta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

