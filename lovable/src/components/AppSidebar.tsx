import { useState, useEffect } from "react";
import {
  Shield, LayoutDashboard, Swords, ShieldCheck, LogOut, Terminal, Bug, Wifi, Activity, UserX, FileText
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import ShinyText from "@/components/ShinyText";
import BorderGlow from "@/components/BorderGlow";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Módulo Ofensivo", url: "/offensive", icon: Swords },
  { title: "Módulo Defensivo", url: "/defensive", icon: ShieldCheck },
  { title: "Reportes", url: "/reports", icon: FileText },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  interface UserProfile {
    username: string;
    email: string;
    role: string;
  }

  const [user, setUser] = useState<UserProfile | null>(null);
  const [nodesActive, setNodesActive] = useState({ kali: false, wazuh: false });

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch(e => console.error("Error loading user profile in sidebar:", e));

    fetch("/api/health", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.services) {
          const customWazuhConnected = localStorage.getItem("wazuh_connected") === "true";
          setNodesActive({
            kali: data.services.kali,
            wazuh: customWazuhConnected || data.services.wazuh
          });
        }
      })
      .catch(e => console.error("Error loading health in sidebar:", e));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch { /* ignore */ }
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        navigate("/login");
      }
    } catch { /* ignore */ }
    setDeleting(false);
    setShowDeleteConfirm(false);
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
              <ShinyText
                text="CYBERSHIELD"
                speed={3.5}
                color="#00FF41"
                shineColor="#ffffff"
                className="text-sm font-bold font-mono tracking-wider text-glow-green block"
              />
              <p className="text-[10px] text-primary/80 font-mono tracking-wider font-bold">v1.0.0-TFG</p>
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
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      id={`nav-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      to={item.url}
                      end
                      className="hover:bg-primary/10 transition-all duration-200"
                      activeClassName="bg-primary/15 text-primary glow-green border-l-2 border-primary"
                      onClick={() => {
                        if (isMobile) {
                          setOpenMobile(false);
                        }
                      }}
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
              Perfil de Auditor
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-3 py-1 space-y-3">
              {user ? (
                <div className="space-y-1.5 animate-fade-slide-up">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground truncate">
                      👤 {user.username}
                    </span>
                    <span className="text-[10px] text-primary/80 uppercase font-bold font-mono tracking-wider">
                      {user.role === "admin" ? "🛡️ Administrador" : "🔍 Analista TFG"}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-border/30 space-y-1 text-[10px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Kali Node:</span>
                      <span className={nodesActive.kali ? "text-primary font-bold" : "text-destructive font-bold"}>
                        {nodesActive.kali ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Wazuh SIEM:</span>
                      <span className={nodesActive.wazuh ? "text-primary font-bold" : "text-destructive font-bold"}>
                        {nodesActive.wazuh ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground font-mono">
                  Cargando credenciales...
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-1">
        {/* Modal de confirmación para darse de baja */}
        {showDeleteConfirm && !collapsed && (
          <BorderGlow
            edgeSensitivity={30}
            glowColor="239 68 68"
            backgroundColor="rgba(10, 10, 10, 0.95)"
            borderRadius={8}
            glowRadius={30}
            glowIntensity={1.5}
            coneSpread={40}
            animated={true}
            colors={['#ef4444', '#f97316', '#7f1d1d']}
            className="mb-2 z-20 relative"
          >
            <div className="p-3 space-y-2">
              <p className="text-xs text-destructive font-mono font-bold flex items-center gap-1.5 animate-pulse">
                <span>⚠️</span> ¿SEGURO?
              </p>
              <p className="text-[10px] text-zinc-400 font-mono leading-normal">
                Tu cuenta y todos tus datos se borrarán permanentemente del sistema.
              </p>
              <div className="flex gap-2">
                <button
                  id="btn-delete-account-confirm"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 px-2 py-1.5 text-[10px] font-mono font-bold bg-destructive text-destructive-foreground rounded hover:bg-destructive/80 transition-colors disabled:opacity-50"
                >
                  {deleting ? "BORRANDO..." : "SÍ, ELIMINAR"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-2 py-1.5 text-[10px] font-mono text-muted-foreground border border-border/50 rounded hover:bg-muted/20 transition-colors"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </BorderGlow>
        )}

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              id="btn-delete-account-trigger"
              tooltip="Darse de baja"
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all font-mono w-full"
            >
              <UserX className="mr-2 h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-xs">Darse de baja</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              id="btn-logout"
              tooltip="Cerrar sesión"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all font-mono w-full"
            >
              <LogOut className="mr-2 h-4 w-4 shrink-0" />
              {!collapsed && <span>Cerrar sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
