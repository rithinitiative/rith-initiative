import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsletterPopup } from "@/components/shared/NewsletterPopup";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NavNode, isExternalUrl } from "@/lib/nav";
import { useSiteNav } from "@/hooks/useSiteNav";
import logo from "@/assets/logo.png";

// Fallback used only if the nav table can't be read (keeps the site navigable).
const FALLBACK_NAV: NavNode[] = [
  { id: "f-home", label: "Home", url: "/", parent_id: null, display_order: 0, opens_new_tab: false, is_published: true, children: [] },
  { id: "f-about", label: "About", url: "/about", parent_id: null, display_order: 1, opens_new_tab: false, is_published: true, children: [] },
  { id: "f-projects", label: "Projects", url: "/projects", parent_id: null, display_order: 2, opens_new_tab: false, is_published: true, children: [] },
  { id: "f-events", label: "Events", url: "/events", parent_id: null, display_order: 3, opens_new_tab: false, is_published: true, children: [] },
  { id: "f-blogs", label: "Blogs", url: "/blogs", parent_id: null, display_order: 4, opens_new_tab: false, is_published: true, children: [] },
  { id: "f-shop", label: "Shop", url: "/shop", parent_id: null, display_order: 5, opens_new_tab: false, is_published: true, children: [] },
  { id: "f-donate", label: "Donate", url: "/donate", parent_id: null, display_order: 6, opens_new_tab: false, is_published: true, children: [] },
  { id: "f-contact", label: "Contact", url: "/contact", parent_id: null, display_order: 7, opens_new_tab: false, is_published: true, children: [] },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();

  // Falls back to the static menu while loading, or if the nav can't be read.
  const { data: fetchedNav } = useSiteNav();
  const nav = fetchedNav && fetchedNav.length > 0 ? fetchedNav : FALLBACK_NAV;

  const isActivePath = (url: string | null): boolean => {
    if (!url || isExternalUrl(url)) return false;
    if (url === "/") return location.pathname === "/";
    return location.pathname === url || location.pathname.startsWith(`${url}/`);
  };

  const isNodeActive = (node: NavNode): boolean =>
    isActivePath(node.url) || node.children.some(isNodeActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("email_subscribers")
        .insert({ email, source: "header" });

      if (error) {
        if (error.code === "23505") {
          toast.info("You're already subscribed!");
        } else {
          throw error;
        }
      } else {
        toast.success("Thanks for signing up! We'll keep you updated.");
      }

      setEmail("");
      setShowUpdatesModal(false);
    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // A single link that renders as a router <Link> for internal paths and a
  // plain <a> for external URLs.
  const NavLink = ({
    node,
    className,
    onClick,
    children,
  }: {
    node: NavNode;
    className?: string;
    onClick?: () => void;
    children?: React.ReactNode;
  }) => {
    const content = children ?? node.label;
    if (!node.url) {
      return <span className={className}>{content}</span>;
    }
    if (isExternalUrl(node.url)) {
      return (
        <a
          href={node.url}
          className={className}
          onClick={onClick}
          target={node.opens_new_tab ? "_blank" : undefined}
          rel={node.opens_new_tab ? "noopener noreferrer" : undefined}
        >
          {content}
        </a>
      );
    }
    return (
      <Link
        to={node.url}
        className={className}
        onClick={onClick}
        target={node.opens_new_tab ? "_blank" : undefined}
        rel={node.opens_new_tab ? "noopener noreferrer" : undefined}
      >
        {content}
      </Link>
    );
  };

  // Renders a dropdown child, plus a nested (indented) list of its own children.
  const DropdownChild = ({ node }: { node: NavNode }) => (
    <div>
      <NavLink
        node={node}
        className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
      />
      {node.children.length > 0 && (
        <div className="mb-1 ml-3 flex flex-col border-l border-border/60 pl-2">
          {node.children.map((grandchild) => (
            <NavLink
              key={grandchild.id}
              node={grandchild}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container-wide">
          <nav className="flex items-center justify-between h-20 md:h-24">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src={logo}
                alt="The Rith Initiative Logo"
                className="h-16 md:h-20 w-auto transition-transform group-hover:scale-105"
                fetchPriority="high"
                decoding="async"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {nav.map((item) =>
                item.children.length > 0 ? (
                  <div key={item.id} className="group relative py-8">
                    <NavLink
                      node={item}
                      className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 ${
                        isNodeActive(item)
                          ? "text-primary after:w-full"
                          : "text-foreground/80 after:w-0 hover:after:w-full"
                      }`}
                    >
                      {item.label}
                      <ChevronDown size={14} />
                    </NavLink>
                    <div className="invisible absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 rounded-lg border border-border/50 bg-card p-2 opacity-0 shadow-elevated transition-all duration-200 group-hover:visible group-hover:opacity-100">
                      {item.children.map((child) => (
                        <DropdownChild key={child.id} node={child} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <NavLink
                    key={item.id}
                    node={item}
                    className={`text-sm font-medium transition-colors hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 ${
                      isActivePath(item.url)
                        ? "text-primary after:w-full"
                        : "text-foreground/80 after:w-0 hover:after:w-full"
                    }`}
                  />
                )
              )}
              <Button
                variant="hero"
                size="sm"
                onClick={() => setShowUpdatesModal(true)}
              >
                <Bell size={16} />
                Get Updates
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </nav>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
              <div className="flex flex-col gap-4">
                {nav.map((item) => (
                  <div key={item.id}>
                    <NavLink
                      node={item}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block text-base font-medium py-2 transition-colors ${
                        isNodeActive(item) ? "text-primary" : "text-foreground/80 hover:text-primary"
                      }`}
                    />
                    {item.children.length > 0 && (
                      <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                        {item.children.map((child) => (
                          <div key={child.id}>
                            <NavLink
                              node={child}
                              onClick={() => setIsMenuOpen(false)}
                              className="block py-1 text-sm font-medium text-foreground/90 hover:text-primary"
                            />
                            {child.children.length > 0 && (
                              <div className="mb-1 ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
                                {child.children.map((grandchild) => (
                                  <NavLink
                                    key={grandchild.id}
                                    node={grandchild}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="py-1 text-sm text-muted-foreground hover:text-primary"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  variant="hero"
                  className="mt-2"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowUpdatesModal(true);
                  }}
                >
                  <Bell size={16} />
                  Get Updates
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Updates Modal */}
      {showUpdatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-card rounded-2xl shadow-elevated p-8 animate-scale-in">
            <button
              onClick={() => setShowUpdatesModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-muted-foreground" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading text-2xl font-semibold text-foreground mb-2">
                Stay in the Loop
              </h3>
              <p className="text-muted-foreground">
                Share your email to receive updates about new events, cultural programs, and community initiatives.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full h-12 px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing up..." : "Get Updates"}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-4">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      )}

      <NewsletterPopup />
    </>
  );
}
