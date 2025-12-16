import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppData } from '@/types';
import { toast } from '@/hooks/use-toast';
import { BrandingTab } from './admin/BrandingTab';
import { ProductsTab } from './admin/ProductsTab';
import { InfoTab } from './admin/InfoTab';
import { ThemeTab } from './admin/ThemeTab';
import { SectionsTab } from './admin/SectionsTab';
import { SettingsTab } from './admin/SettingsTab';
import { TagsTab } from './admin/TagsTab';
import { saveDataToSupabase } from '@/lib/supabaseStorage';
import { AdminPreview } from './admin/AdminPreview';
interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onDataChange: (data: AppData) => void;
  onLogout: () => void;
  userSlug?: string;
  bakeryId?: string;
  onViewSite?: () => void;
}
export function AdminPanel({
  isOpen,
  onClose,
  data,
  onDataChange,
  onLogout,
  userSlug,
  bakeryId,
  onViewSite
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState('branding');
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewFull, setIsPreviewFull] = useState(false);

  const handleSave = async () => {
    if (!bakeryId) {
      console.error('❌ Erro: bakeryId não fornecido');
      toast({
        title: "Erro ao salvar",
        description: "ID da confeitaria não encontrado.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    console.log('🔄 Iniciando salvamento...', { bakeryId, data });
    
    try {
      const saved = await saveDataToSupabase(data, bakeryId);
      
      if (!saved) {
        console.error('❌ Salvamento falhou');
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar as alterações. Verifique o console para detalhes.",
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }
      
      console.log('✅ Salvamento concluído com sucesso!');
      toast({
        title: "Salvo com sucesso!",
        description: "Suas alterações foram salvas no banco de dados."
      });
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro inesperado. Verifique o console para detalhes.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">
            Painel Administrativo
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {isPreviewFull ? (
            // Modo preview em tela cheia dentro do painel
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Pré-visualização em tela cheia</p>
                  <p className="text-xs text-muted-foreground">
                    Veja seu cardápio exatamente como suas clientes verão
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewFull(false)}
                >
                  Voltar para edição
                </Button>
              </div>
              <AdminPreview data={data} mode="fullscreen" />
            </div>
          ) : (
            // Modo split view (editor + preview lado a lado)
            <div className="space-y-3">
              {/* Botão de pré-visualização para mobile */}
              <div className="flex justify-end md:hidden mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewFull(true)}
                >
                  Pré-visualização
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:min-h-0">
                {/* Coluna do editor */}
                <div className="flex flex-col gap-4 min-h-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-7 w-full">
                      <TabsTrigger value="branding">Marca</TabsTrigger>
                      <TabsTrigger value="theme">Cores</TabsTrigger>
                      <TabsTrigger value="sections">Seções</TabsTrigger>
                      <TabsTrigger value="tags">Tags</TabsTrigger>
                      <TabsTrigger value="products">Produtos</TabsTrigger>
                      <TabsTrigger value="info">Info</TabsTrigger>
                      <TabsTrigger value="settings">Config</TabsTrigger>
                    </TabsList>

                    <div className="mt-4">
                      <TabsContent value="branding">
                        <BrandingTab
                          data={data}
                          onDataChange={onDataChange}
                          bakeryId={bakeryId}
                        />
                      </TabsContent>

                      <TabsContent value="theme">
                        <ThemeTab
                          data={data}
                          onDataChange={onDataChange}
                          bakeryId={bakeryId}
                        />
                      </TabsContent>

                      <TabsContent value="sections">
                        <SectionsTab data={data} onDataChange={onDataChange} />
                      </TabsContent>

                      <TabsContent value="tags">
                        <TagsTab data={data} onDataChange={onDataChange} />
                      </TabsContent>

                      <TabsContent value="products">
                        <ProductsTab data={data} onDataChange={onDataChange} />
                      </TabsContent>

                      <TabsContent value="info">
                        <InfoTab
                          data={data}
                          onDataChange={onDataChange}
                          bakeryId={bakeryId}
                        />
                      </TabsContent>

                      <TabsContent value="settings">
                        <SettingsTab
                          data={data}
                          onDataChange={onDataChange}
                          bakeryId={bakeryId}
                        />
                      </TabsContent>
                    </div>
                  </Tabs>

                  {/* Botões de ação */}
                  <div className="flex flex-wrap gap-3 border-t pt-4 mt-2">
                    {userSlug && (
                      <Button
                        onClick={onViewSite}
                        variant="outline"
                        className="flex-1 min-w-[150px]"
                      >
                        Ver Meu Site
                      </Button>
                    )}

                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 min-w-[150px]"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>

                    <Button onClick={onLogout} variant="destructive">
                      <X className="h-4 w-4 mr-2" />
                      Sair
                    </Button>
                  </div>
                </div>

                {/* Coluna do preview (apenas em telas médias ou maiores) */}
                <div className="space-y-3 hidden md:flex md:flex-col md:min-h-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Pré-visualização</p>
                      <p className="text-xs text-muted-foreground">
                        Veja como seu cardápio está ficando
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPreviewFull(true)}
                    >
                      Tela cheia
                    </Button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-auto">
                    <AdminPreview data={data} mode="sidebar" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}