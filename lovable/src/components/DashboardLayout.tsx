import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu } from "lucide-react";

const DashboardLayout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const auth = localStorage.getItem("cybershield_auth");
    if (!auth) navigate("/login");
  }, [navigate]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
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
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
