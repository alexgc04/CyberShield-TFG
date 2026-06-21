import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";

const DashboardLayout = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setProgress(15);
    setVisible(true);

    const t1 = setTimeout(() => {
      setProgress(60);
    }, 80);

    const t2 = setTimeout(() => {
      setProgress(100);
    }, 280);

    const t3 = setTimeout(() => {
      setVisible(false);
    }, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative">
        {/* NProgress-style top loading bar */}
        {visible && (
          <div
            className="fixed top-0 left-0 h-[2px] bg-primary shadow-[0_0_8px_hsl(var(--primary))] z-[9999] transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        )}
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="h-12 flex items-center border-b border-border/30 bg-card/30 backdrop-blur-sm px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-primary transition-colors">
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <div className="ml-4 flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="text-primary">●</span> SISTEMA OPERATIVO
              <span className="text-primary/50">|</span>
              <span className="text-neon-green">ONLINE</span>
            </div>
          </header>
          <main key={location.pathname} className="flex-1 overflow-auto p-6 animate-page-transition">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
