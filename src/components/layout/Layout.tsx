import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  // The homepage keeps its original spacing; every other page uses the tighter
  // "compact-page" rhythm (see .compact-page overrides in index.css).
  const isHome = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className={cn("flex-1 pt-16 md:pt-20", !isHome && "compact-page")}>
        {children}
      </main>
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
