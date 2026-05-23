import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsletterPopup } from "@/components/shared/NewsletterPopup";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getProjectPath, sortProjects } from "@/lib/projects";
import logo from "@/assets/logo.png";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/events", label: "Events" },
  { href: "/shop", label: "Shop" },
  { href: "/donate", label: "Donate" },
  { href: "/contact", label: "Contact" },
];

interface ProjectNavItem {
  id: string;
  title: string;
  project_slug: string | null;
  project_display_order: number | null;
  start_date: string;
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<ProjectNavItem[]>([]);
  const location = useLocation();

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, project_slug, project_display_order, start_date")
        .eq("is_project", true)
        .eq("project_is_published", true)
        .eq("is_archived", false)
        .order("project_display_order", { ascending: true })
        .order("start_date", { ascending: true });

      if (!error) {
        setProjects(sortProjects((data || []) as ProjectNavItem[]));
      }
    };

    fetchProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('email_subscribers')
        .insert({ email, source: 'header' });

      if (error) {
        if (error.code === '23505') {
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
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) =>
                link.href === "/projects" ? (
                  <div key={link.href} className="group relative py-8">
                    <Link
                      to={link.href}
                      className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 ${
                        location.pathname.startsWith("/projects")
                          ? "text-primary after:w-full"
                          : "text-foreground/80 after:w-0 hover:after:w-full"
                      }`}
                    >
                      Projects
                      <ChevronDown size={14} />
                    </Link>
                    <div className="invisible absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 rounded-lg border border-border/50 bg-card p-2 opacity-0 shadow-elevated transition-all duration-200 group-hover:visible group-hover:opacity-100">
                      <Link
                        to="/projects"
                        className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                      >
                        All Projects
                      </Link>
                      {projects.map((project) => (
                        <Link
                          key={project.id}
                          to={getProjectPath(project)}
                          className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          {project.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`text-sm font-medium transition-colors hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 ${
                      location.pathname === link.href
                        ? "text-primary after:w-full"
                        : "text-foreground/80 after:w-0 hover:after:w-full"
                    }`}
                  >
                    {link.label}
                  </Link>
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
                {navLinks.map((link) => (
                  <div key={link.href}>
                    <Link
                      to={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block text-base font-medium py-2 transition-colors ${
                        location.pathname === link.href || (link.href === "/projects" && location.pathname.startsWith("/projects"))
                          ? "text-primary"
                          : "text-foreground/80 hover:text-primary"
                      }`}
                    >
                      {link.label}
                    </Link>
                    {link.href === "/projects" && projects.length > 0 && (
                      <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                        {projects.map((project) => (
                          <Link
                            key={project.id}
                            to={getProjectPath(project)}
                            onClick={() => setIsMenuOpen(false)}
                            className="py-1 text-sm text-muted-foreground hover:text-primary"
                          >
                            {project.title}
                          </Link>
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
