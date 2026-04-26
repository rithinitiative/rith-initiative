import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "@/components/shared/ScrollToTop";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const Events = lazy(() => import("./pages/Events"));
const Donate = lazy(() => import("./pages/Donate"));
const Stories = lazy(() => import("./pages/Stories"));
const Shop = lazy(() => import("./pages/Shop"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome"));
const AdminEvents = lazy(() => import("./pages/admin/AdminEvents"));
const AdminEventForm = lazy(() => import("./pages/admin/AdminEventForm"));
const AdminPosts = lazy(() => import("./pages/admin/AdminPosts"));
const AdminPostForm = lazy(() => import("./pages/admin/AdminPostForm"));
const AdminUpdates = lazy(() => import("./pages/admin/AdminUpdates"));
const AdminUpdateForm = lazy(() => import("./pages/admin/AdminUpdateForm"));
const AdminGallery = lazy(() => import("./pages/admin/AdminGallery"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSubscribers = lazy(() => import("./pages/admin/AdminSubscribers"));
const AdminShop = lazy(() => import("./pages/admin/AdminShop"));
const AdminShopItemForm = lazy(() => import("./pages/admin/AdminShopItemForm"));
const AdminTeam = lazy(() => import("./pages/admin/AdminTeam"));

function RouteLoadingFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" aria-live="polite" aria-busy="true">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function EventShareRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/events?event=${encodeURIComponent(id)}` : "/events"} replace />;
}

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/share/:id" element={<EventShareRedirect />} />
              <Route path="/stories" element={<Stories />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/donate" element={<Donate />} />
              <Route path="/contact" element={<Contact />} />
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />}>
                <Route index element={<AdminHome />} />
                <Route path="events" element={<AdminEvents />} />
                <Route path="events/new" element={<AdminEventForm />} />
                <Route path="events/:id" element={<AdminEventForm />} />
                <Route path="updates" element={<AdminUpdates />} />
                <Route path="updates/new" element={<AdminUpdateForm />} />
                <Route path="updates/:id" element={<AdminUpdateForm />} />
                <Route path="posts" element={<AdminPosts />} />
                <Route path="posts/new" element={<AdminPostForm />} />
                <Route path="posts/:id" element={<AdminPostForm />} />
                <Route path="gallery" element={<AdminGallery />} />
                <Route path="team" element={<AdminTeam />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="subscribers" element={<AdminSubscribers />} />
                <Route path="shop" element={<AdminShop />} />
                <Route path="shop/new" element={<AdminShopItemForm />} />
                <Route path="shop/:id" element={<AdminShopItemForm />} />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
