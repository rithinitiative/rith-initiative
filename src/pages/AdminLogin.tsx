import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageMeta } from '@/components/shared/PageMeta';
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [loginAttempted, setLoginAttempted] = useState(false);
  const { signIn, signUp, signOut, user, isAdmin, isLoading, isCheckingAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pageTitle = 'Admin Login';
  const pageDescription = 'Secure administrator login for The Rith Initiative website.';

  // Navigate to admin dashboard once authenticated as admin (wait for admin check to settle)
  useEffect(() => {
    if (!isLoading && !isCheckingAdmin && user && isAdmin) {
      navigate('/admin');
    }
  }, [user, isAdmin, isLoading, isCheckingAdmin, navigate]);

  // After a login attempt, once admin check settles: if not admin, reject access
  useEffect(() => {
    if (!loginAttempted || !user || isCheckingAdmin) return;

    if (!isAdmin) {
      signOut();
      setLoginAttempted(false);
      setIsSubmitting(false);
      toast({
        title: 'Access denied',
        description: 'You do not have admin privileges. Contact an existing administrator.',
        variant: 'destructive',
      });
    }
  }, [loginAttempted, user, isAdmin, isCheckingAdmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Missing fields',
        description: 'Please enter both email and password.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          title: 'Login failed',
          description: error.message,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Mark that we attempted login; useEffect above handles access denial
      setLoginAttempted(true);
    } catch (err) {
      toast({
        title: 'Login failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Missing fields',
        description: 'Please enter email and password.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signUp(email, password, fullName);
      
      if (error) {
        toast({
          title: 'Sign up failed',
          description: error.message,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: 'Account created!',
        description: 'Please check your email to confirm your account. Once confirmed, return here to sign in.',
      });
      
      setActiveTab('login');
      setPassword('');
      setIsSubmitting(false);
    } catch (err) {
      toast({
        title: 'Sign up failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPassword('');
    setShowPassword(false);
  };

  if (isLoading) {
    return (
      <>
        <PageMeta
          title={pageTitle}
          description={pageDescription}
          path="/admin/login"
          noindex
          nofollow
        />
        <div className="min-h-screen bg-background p-6">
          <div className="mx-auto max-w-md space-y-4 pt-16">
            <Skeleton className="mx-auto h-8 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={pageTitle}
        description={pageDescription}
        path="/admin/login"
        noindex
        nofollow
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-secondary/30 to-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-elevated p-8 border border-border/50">
            <div className="text-center mb-6">
              <Link to="/" className="inline-block mb-6">
                <img src={logo} alt="The Rith Initiative" className="h-12 mx-auto" />
              </Link>
              <h1 className="font-heading text-2xl font-semibold text-foreground mb-2">
                Admin Access
              </h1>
              <p className="text-muted-foreground text-sm">
                Sign in or create an account to continue
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); resetForm(); }}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name (optional)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft size={16} />
                Back to website
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Admin access is granted by existing administrators.
          </p>
        </div>
      </div>
    </>
  );
}
