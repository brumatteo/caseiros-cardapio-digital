import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Loader2, Lock } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    // Verificar se há token de recovery na URL e processar
    const checkRecoveryToken = async () => {
      try {
        // Verificar hash da URL para token de recovery
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (type === 'recovery' && accessToken) {
          // Processar token de recovery com Supabase
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (error) {
            console.error('Erro ao processar token de recovery:', error);
            setIsValidToken(false);
            setIsValidating(false);
            toast({
              title: 'Link inválido',
              description: 'Este link de redefinição de senha não é válido ou expirou.',
              variant: 'destructive',
            });
            return;
          }

          if (data.session) {
            // Token válido e sessão criada
            setIsValidToken(true);
            setIsValidating(false);
            
            // Limpar hash da URL para evitar revalidação
            window.history.replaceState({}, '', window.location.pathname);
          } else {
            setIsValidToken(false);
            setIsValidating(false);
            toast({
              title: 'Link inválido',
              description: 'Não foi possível processar o link de redefinição.',
              variant: 'destructive',
            });
          }
        } else {
          // Verificar se há sessão de recovery já processada
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Sessão válida (recovery já processado anteriormente)
            setIsValidToken(true);
            setIsValidating(false);
          } else {
            // Sem token válido
            setIsValidToken(false);
            setIsValidating(false);
            toast({
              title: 'Link inválido',
              description: 'Este link de redefinição de senha não é válido ou expirou.',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('Erro ao validar token:', error);
        setIsValidToken(false);
        setIsValidating(false);
        toast({
          title: 'Erro',
          description: 'Ocorreu um erro ao validar o link de redefinição.',
          variant: 'destructive',
        });
      }
    };

    checkRecoveryToken();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, digite sua nova senha.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'Por favor, confirme sua senha corretamente.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('Erro ao redefinir senha:', error);
        toast({
          title: 'Erro ao redefinir senha',
          description: error.message || 'Não foi possível redefinir a senha. Tente novamente.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Sucesso
      toast({
        title: 'Senha redefinida com sucesso!',
        description: 'Sua senha foi atualizada. Você será redirecionado para o login.',
      });

      // Aguardar um pouco antes de redirecionar
      setTimeout(() => {
        navigate('/admin');
      }, 1500);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <div className="max-w-md w-full bg-card border rounded-lg p-8 shadow-lg text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validando link de redefinição...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <div className="max-w-md w-full bg-card border rounded-lg p-8 shadow-lg text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-destructive/10 p-3 rounded-full">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">
            Link Inválido
          </h1>
          <p className="text-muted-foreground mb-6">
            Este link de redefinição de senha não é válido ou expirou.
          </p>
          <Button onClick={() => navigate('/admin')} className="w-full">
            Voltar para o login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="max-w-md w-full bg-card border rounded-lg p-8 shadow-lg">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-primary/10 p-3 rounded-full">
            <Lock className="h-6 w-6 text-primary" />
          </div>
        </div>
        
        <h1 className="text-2xl font-display font-bold text-center mb-2">
          Redefinir Senha
        </h1>
        <p className="text-center text-muted-foreground mb-6">
          Digite sua nova senha abaixo
        </p>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nova Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Confirmar Nova Senha</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite novamente"
              disabled={isLoading}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redefinindo...
              </>
            ) : (
              'Redefinir Senha'
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="text-sm text-primary hover:underline"
              disabled={isLoading}
            >
              Voltar para o login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

