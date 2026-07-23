import { useEffect } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Calendar, LogOut, Home, LayoutDashboard, Users, Mail, Bell, Image, ShoppingBag, UserRound, FolderKanban, FileText, Settings, Menu } from 'lucide-react';
import logo from '@/assets/logo.png';
import { AdminListSkeleton } from "@/components/shared/skeletons";

export default function AdminDashboard() {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <AdminListSkeleton />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/events', label: 'Events', icon: Calendar },
    { href: '/admin/projects', label: 'Projects', icon: FolderKanban },
    { href: '/admin/posts', label: 'Blog Posts', icon: FileText },
    { href: '/admin/updates', label: 'Updates', icon: Bell },
    { href: '/admin/shop', label: 'Shop', icon: ShoppingBag },
    { href: '/admin/gallery', label: 'Home Gallery', icon: Image },
    { href: '/admin/team', label: 'Rith Team', icon: UserRound },
    { href: '/admin/users', label: 'Administrators', icon: Users },
    { href: '/admin/subscribers', label: 'Subscribers', icon: Mail },
    { href: '/admin/nav', label: 'Navigation', icon: Menu },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border/50 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <img src={logo} alt="The Rith Initiative" className="h-8" />
              </Link>
              <span className="text-sm text-muted-foreground">Admin Dashboard</span>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/" className="gap-2">
                  <Home size={16} />
                  <span className="hidden sm:inline">View Site</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href, item.exact)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
