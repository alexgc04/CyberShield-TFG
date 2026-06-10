import {
  Shield, LayoutDashboard, Swords, ShieldCheck, LogOut, Terminal, Bug, Wifi, Activity
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Módulo Ofensivo", url: "/offensive", icon: Swords },
  { title: "Módulo Defensivo", url: "/defensive", icon: ShieldCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:3020/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch { /* ignore */ }
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg border border-primary/40 glow-green bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-primary font-mono tracking-wider text-glow-green">
                CYBERSHIELD
              </h2>
              <p className="text-[10px] text-muted-foreground font-mono">PRO v2.4.1</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
            {!collapsed && "Navegación"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-primary/10 transition-all duration-200"
                      activeClassName="bg-primary/15 text-primary glow-green border-l-2 border-primary"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span className="font-medium text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
              Estado del Sistema
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono">
                <Activity className="w-3 h-3 text-neon-green animate-pulse" />
                <span className="text-muted-foreground">Firewalls: </span>
                <span className="text-neon-green">ACTIVOS</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <Bug className="w-3 h-3 text-neon-cyan" />
                <span className="text-muted-foreground">Escaneos: </span>
                <span className="text-neon-cyan">3 hoy</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <Wifi className="w-3 h-3 text-neon-green" />
                <span className="text-muted-foreground">Red: </span>
                <span className="text-neon-green">SEGURA</span>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all font-mono"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
