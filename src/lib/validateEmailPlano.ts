import supabasePlano from '@/lib/supabasePlanoClient';
import { toast } from '@/hooks/use-toast';

export async function validateEmailInSupabasePlano(email: string): Promise<boolean> {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) return false;

  try {
    const { data, error } = await supabasePlano
      .from('users_hub')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Erro ao validar e-mail no Plano:', error);
      toast({
        title: 'Falha ao validar e-mail',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Erro de rede ao validar e-mail no Plano:', err);
    toast({
      title: 'Falha ao validar e-mail',
      description: 'Tente novamente.',
      variant: 'destructive',
    });
    return false;
  }
}


