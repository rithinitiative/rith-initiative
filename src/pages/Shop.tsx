import { Layout } from "@/components/layout/Layout";
import { PageMeta } from "@/components/shared/PageMeta";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ShoppingBag, ExternalLink, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, createBreadcrumbSchema, createWebPageSchema } from "@/lib/seo";
import { htmlToPlainText, sanitizeRichText } from "@/lib/richText";

interface ShopItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  purchase_link: string | null;
  category: string | null;
}

export default function Shop() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);

  const pageTitle = "Shop";
  const pageDescription = "Browse Indian cultural merchandise and artisan products from The Rith Initiative. Support Indian American arts and heritage with your purchase.";

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const { data, error } = await supabase
          .from('shop_items')
          .select('*')
          .eq('is_published', true)
          .eq('is_archived', false)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setItems(data || []);
      } catch (error) {
        console.error('Error fetching shop items:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, []);

  const shopPageSchema = createWebPageSchema({
    title: `${pageTitle} | The Rith Initiative`,
    description: pageDescription,
    path: "/shop",
    type: "CollectionPage",
  });
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
  ]);
  const productSchemas = items.slice(0, 20).map((item) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.title,
    ...(item.description ? { description: htmlToPlainText(item.description) } : {}),
    ...(item.image_url ? { image: item.image_url } : {}),
    ...(item.category ? { category: item.category } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: Number(item.price).toFixed(2),
      availability: "https://schema.org/InStock",
      ...(item.purchase_link ? { url: item.purchase_link } : { url: `${SITE_URL}/shop` }),
    },
  }));

  return (
    <Layout>
      <PageMeta
        title={pageTitle}
        description={pageDescription}
        keywords="Indian cultural merchandise, Indian artisan products, Indian American shop, support Indian arts, Indian heritage gifts"
        path="/shop"
        jsonLd={[shopPageSchema, breadcrumbSchema, ...productSchemas]}
      />
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-secondary/30 to-background">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto text-center">
            <ScrollReveal variant="fade-up">
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
                Shop
              </h1>
            </ScrollReveal>
            <ScrollReveal variant="fade-up" delay={100}>
              <p className="text-base text-muted-foreground leading-relaxed italic">
                Support The Rith Initiative by purchasing cultural merchandise and handcrafted items.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Products Section */}
      <section className="section-padding">
        <div className="container-wide">
          <ScrollReveal variant="fade-up">
            <SectionHeading
              title="Our Collection"
              subtitle="Curated items celebrating Indian culture and heritage"
              centered
            />
          </ScrollReveal>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : items.length === 0 ? (
            <ScrollReveal variant="fade-up" delay={100}>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-3">
                  Coming Soon
                </h3>
                <p className="text-muted-foreground max-w-md">
                  We're curating a special collection of cultural items and merchandise.
                  Check back soon to discover unique products that support our mission.
                </p>
              </div>
            </ScrollReveal>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {items.map((item, index) => (
                <ScrollReveal key={item.id} variant="fade-up" delay={index * 80}>
                  <div
                    onClick={() => setSelectedItem(item)}
                    className="group bg-card rounded-2xl border border-border/50 shadow-soft hover:shadow-elevated transition-all duration-300 overflow-hidden flex flex-col h-full cursor-pointer"
                  >
                    {item.image_url ? (
                      <div className="aspect-square bg-secondary/20 overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-secondary/20 flex items-center justify-center">
                        <ShoppingBag className="w-16 h-16 text-muted-foreground/30" />
                      </div>
                    )}

                    <div className="p-5 flex flex-col flex-1">
                      {item.category && (
                        <span className="text-xs font-medium text-primary mb-2">{item.category}</span>
                      )}
                      <h3 className="font-heading text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      {item.description && (
                        <div
                          className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_p]:mb-2 [&_p:last-child]:mb-0"
                          dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.description) }}
                        />
                      )}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/30">
                        <span className="text-lg font-semibold text-foreground">
                          ${Number(item.price).toFixed(2)}
                        </span>
                        {item.purchase_link && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(item.purchase_link!, '_blank');
                            }}
                            className="gap-2"
                          >
                            Buy Now
                            <ExternalLink size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0">
          {selectedItem && (
            <div className="flex flex-col md:flex-row">
              {/* Left: Image */}
              <div className="md:w-1/2 bg-secondary/20 flex items-center justify-center p-6 min-h-[300px] md:min-h-[450px]">
                {selectedItem.image_url ? (
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.title}
                    className="w-full h-full max-h-[450px] object-contain"
                  />
                ) : (
                  <ShoppingBag className="w-24 h-24 text-muted-foreground/30" />
                )}
              </div>

              {/* Right: Details */}
              <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
                {selectedItem.category && (
                  <span className="text-xs font-medium text-primary uppercase tracking-wider mb-2">
                    {selectedItem.category}
                  </span>
                )}

                <h2 className="font-heading text-2xl md:text-3xl font-semibold text-foreground mb-3">
                  {selectedItem.title}
                </h2>

                <span className="text-2xl font-bold text-foreground mb-5">
                  ${Number(selectedItem.price).toFixed(2)}
                </span>

                <hr className="border-border/50 mb-5" />

                {selectedItem.description ? (
                  <div
                    className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:font-heading [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(selectedItem.description) }}
                  />
                ) : (
                  <div className="flex-1" />
                )}

                {selectedItem.purchase_link && (
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => window.open(selectedItem.purchase_link!, '_blank')}
                  >
                    Buy Now
                    <ExternalLink size={16} />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
