import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AppData } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SettingsTabProps {
  data: AppData;
  onDataChange: (data: AppData) => void;
  bakeryId?: string;
}

export function SettingsTab({ data, onDataChange, bakeryId }: SettingsTabProps) {
  // Password features removed

  // 🚀 Atualiza dados locais e no Supabase (sem notificação visual)
  const updateSettings = async (updates: Partial<typeof data.settings>) => {
    const newSettings = {
      ...data.settings,
      ...updates,
    };

    // Atualiza no estado local imediatamente
    onDataChange({
      ...data,
      settings: newSettings,
    });

    // ⚙️ Atualiza também no Supabase silenciosamente
    if (!bakeryId) {
      console.warn("⚠️ Nenhum bakeryId informado — salvamento local apenas.");
      return;
    }

    const { error } = await supabase
      .from('bakeries')
      .update({
        settings: newSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bakeryId);

    if (error) {
      console.error('❌ Erro ao salvar configurações:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações no Supabase.',
        variant: 'destructive',
      });
    } else {
      console.log('✅ Configurações salvas silenciosamente');
    }
  };


  // 🔄 Campos de segurança e contato
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Contato</h3>

        <div className="space-y-4">
          <div>
            <Label>Número do WhatsApp (com código do país)</Label>
            <Input
              value={data?.settings?.whatsappNumber || ''}
              onChange={(e) => updateSettings({ whatsappNumber: e.target.value })}
              placeholder="5511999999999"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formato: código do país + DDD + número (ex: 5511999999999)
            </p>
          </div>

          <div>
            <Label>Mensagem de Pedido (WhatsApp)</Label>
            <Textarea
              value={data?.settings?.whatsappMessage || ''}
              onChange={(e) => updateSettings({ whatsappMessage: e.target.value })}
              placeholder="Olá! Gostaria de confirmar meu pedido:"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Esta será a primeira linha da mensagem enviada ao WhatsApp
            </p>
          </div>
        </div>
      </div>

      {/* Segurança removida: autenticação agora é somente por e-mail via Plano */}
    </div>
  );
}
