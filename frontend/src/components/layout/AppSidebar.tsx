import { NavLink, useLocation } from "react-router-dom";
import { Home, Upload, BarChart3, Info, Brain, Shield, Zap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigation = [
  { title: "News Hub", url: "/", icon: Home },
  { title: "Upload Data", url: "/upload", icon: Upload },
  { title: "Results", url: "/results", icon: BarChart3 },
  { title: "Analyze Transactions", url: "/analyze", icon: Zap },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-gradient-qtrack-dark border-r border-border/20">
        {/* QTRACK Brand Section */}
        <div className="p-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-qtrack-primary">
              <Brain className="h-6 w-6 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="text-lg font-bold bg-gradient-qtrack-primary bg-clip-text text-transparent">
                  QTRACK
                </h2>
                <p className="text-xs text-neutral-400">Fraud Detection</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className="text-neutral-400 text-xs font-semibold uppercase tracking-wide px-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="w-full">
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive: linkActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          linkActive || isActive(item.url)
                            ? "bg-gradient-qtrack-primary text-white shadow-glow-primary"
                            : "text-neutral-300 hover:text-white hover:bg-white/10"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Features Section */}
        {!isCollapsed && (
          <SidebarGroup className="px-2">
            <SidebarGroupLabel className="text-neutral-400 text-xs font-semibold uppercase tracking-wide px-2">
              Features
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2 px-2">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Shield className="h-4 w-4" />
                  <span>Real-time Detection</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Zap className="h-4 w-4" />
                  <span>Quantum ML</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Brain className="h-4 w-4" />
                  <span>Unsupervised Learning</span>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}