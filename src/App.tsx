import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "@/components/shared/ScrollToTop";
import { PageSkeleton } from "@/components/shared/skeletons";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const Events = lazy(() => import("./pages/Events"));
const Blogs = lazy(() => import("./pages/Blogs"));
const Donate = lazy(() => import("./pages/Donate"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
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
const AdminBlogPosts = lazy(() => import("./pages/admin/AdminBlogPosts"));
const AdminBlogPostForm = lazy(() => import("./pages/admin/AdminBlogPostForm"));
const AdminUpdates = lazy(() => import("./pages/admin/AdminUpdates"));
const AdminUpdateForm = lazy(() => import("./pages/admin/AdminUpdateForm"));
const AdminGallery = lazy(() => import("./pages/admin/AdminGallery"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSubscribers = lazy(() => import("./pages/admin/AdminSubscribers"));
const AdminShop = lazy(() => import("./pages/admin/AdminShop"));
const AdminShopItemForm = lazy(() => import("./pages/admin/AdminShopItemForm"));
const AdminTeam = lazy(() => import("./pages/admin/AdminTeam"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

function RouteLoadingFallback() {
  return <PageSkeleton />;
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
              <Route path="/blogs" element={<Blogs />} />
              <Route path="/stories" element={<Navigate to="/blogs" replace />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:slug" element={<ProjectDetail />} />
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
                <Route path="projects" element={<AdminPosts />} />
                <Route path="projects/new" element={<AdminPostForm />} />
                <Route path="projects/:id" element={<AdminPostForm />} />
                <Route path="posts" element={<AdminBlogPosts />} />
                <Route path="posts/new" element={<AdminBlogPostForm />} />
                <Route path="posts/:id" element={<AdminBlogPostForm />} />
                <Route path="updates" element={<AdminUpdates />} />
                <Route path="updates/new" element={<AdminUpdateForm />} />
                <Route path="updates/:id" element={<AdminUpdateForm />} />
                <Route path="gallery" element={<AdminGallery />} />
                <Route path="team" element={<AdminTeam />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="subscribers" element={<AdminSubscribers />} />
                <Route path="settings" element={<AdminSettings />} />
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
