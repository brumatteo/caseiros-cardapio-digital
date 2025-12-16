import { useEffect, useRef, useState } from 'react';
import { AppData } from '@/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ProductCard } from '@/components/ProductCard';
import { Footer } from '@/components/Footer';

type AdminPreviewMode = 'sidebar' | 'fullscreen';

interface AdminPreviewProps {
  data: AppData;
  mode?: AdminPreviewMode;
}

const DESKTOP_PREVIEW_WIDTH = 1280;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1;

export function AdminPreview({ data, mode = 'sidebar' }: AdminPreviewProps) {
  // Aplicar as cores do tema também no preview
  useThemeColors(data.settings as any);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);

  // Para o preview lateral, ajusta zoom para caber no painel mantendo layout desktop
  useEffect(() => {
    if (mode !== 'sidebar') {
      setZoom(1);
      return;
    }

    if (typeof window === 'undefined') return;

    const element = containerRef.current;
    if (!element) return;

    const updateZoom = () => {
      const availableWidth = element.clientWidth;
      if (!availableWidth || !Number.isFinite(availableWidth)) return;

      const raw = availableWidth / DESKTOP_PREVIEW_WIDTH;
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, raw));
      setZoom(clamped);
    };

    updateZoom();

    // Preferir ResizeObserver para acompanhar mudanças de largura do container
    if (typeof (window as any).ResizeObserver !== 'undefined') {
      const ResizeObserverCtor: typeof ResizeObserver = (window as any)
        .ResizeObserver;

      const observer = new ResizeObserverCtor(() => {
        updateZoom();
      });

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    }

    // Fallback simples em caso de ambiente sem ResizeObserver
    window.addEventListener('resize', updateZoom);
    return () => {
      window.removeEventListener('resize', updateZoom);
    };
  }, [mode]);

  const content = (
    <div className="min-h-full flex flex-col bg-background">
      {/* Navbar - mesma regra do público: só se tiver nome ou logo */}
      {(data.settings.brandName || data.settings.logoImage) && (
        <Navbar
          settings={data.settings}
          cartItemCount={0}
          onCartClick={() => {}}
        />
      )}

      {/* Conteúdo principal */}
      <main className="flex-1">
        {/* Hero */}
        <Hero settings={data.settings} />

        {/* Seções e produtos */}
        <div className="container mx-auto px-4 py-8">
          {data.sections
            .filter((section) => section.visible)
            .sort((a, b) => a.order - b.order)
            .map((section, index) => {
              const sectionProducts = data.products.filter((p) =>
                section.productIds.includes(p.id)
              );

              if (sectionProducts.length === 0) {
                return null;
              }

              const bgClass =
                index % 2 === 0 ? 'bg-background' : 'bg-muted/30';

              return (
                <section
                  key={section.id}
                  id={`section-${section.id}`}
                  className={`py-8 -mx-4 px-4 mb-6 ${bgClass}`}
                >
                  <div className="container mx-auto">
                    <h2 className="text-2xl font-display font-bold mb-6 text-center">
                      {section.name}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {sectionProducts.map((product) => (
                        <div key={product.id}>
                          <ProductCard
                            product={product}
                            tags={data.tags}
                            // No preview não precisamos de carrinho: ação vazia
                            onAddToCart={() => {}}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}

          {/* Sobre nós */}
          {data.settings.showAbout && (
            <section className="mb-16 bg-card/40 backdrop-blur-sm rounded-2xl p-10 max-w-6xl mx-auto">
              <h2 className="text-2xl font-display font-bold text-center mb-8">
                {data.settings.aboutTitle}
              </h2>
              <div className="flex flex-col md:flex-row gap-10 items-center">
                <div className="w-full md:w-[45%]">
                  {data.settings.showAboutImage !== false &&
                  data.settings.aboutImage ? (
                    <img
                      src={data.settings.aboutImage}
                      alt={data.settings.aboutTitle || 'Sobre'}
                      className="w-full rounded-xl shadow-xl object-cover"
                      style={{ aspectRatio: '16/10' }}
                    />
                  ) : (
                    <div className="w-full rounded-xl border border-dashed border-border bg-muted/40 flex items-center justify-center text-sm text-muted-foreground" style={{ aspectRatio: '16/10' }}>
                      Imagem aparecerá aqui
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center px-2 md:px-4">
                  <p className="text-base md:text-lg whitespace-pre-wrap leading-relaxed text-foreground/90 text-center md:text-left">
                    {data.settings.aboutText}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Informações extras */}
          {data.settings.showExtraInfo && (
            <section className="mb-12 bg-muted/40 rounded-xl p-8 max-w-4xl mx-auto">
              <h2 className="text-xl font-display font-bold text-center mb-4">
                {data.settings.extraInfoTitle}
              </h2>
              <p className="text-center text-muted-foreground whitespace-pre-line leading-relaxed">
                {data.settings.extraInfoText}
              </p>
            </section>
          )}
        </div>
      </main>

      {/* Rodapé */}
      <Footer settings={data.settings} />
    </div>
  );

  if (mode === 'fullscreen') {
    // Modo tela cheia: site em escala 100%, com scroll normal
    return (
      <div className="min-h-[60vh] bg-background rounded-xl border border-border overflow-hidden">
        {content}
      </div>
    );
  }

  // Modo sidebar: site desktop "reduzido" com zoom para caber no painel
  return (
    <div className="min-h-[400px] bg-background rounded-xl border border-border overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full overflow-auto py-2 px-1"
      >
        <div
          className="mx-auto"
          style={{
            width: DESKTOP_PREVIEW_WIDTH,
            // zoom é suportado pelos principais navegadores desktop; evita o espaço "fantasma" do transform
            zoom,
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}

