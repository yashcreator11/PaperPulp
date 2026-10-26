import { NavLink } from "react-router-dom";
import { SIDEBAR_ITEMS } from "../sidebar/sidebarItems";
import { ROLE_SIDEBAR_ACCESS } from "../sidebar/roleSidebarConfig";
import { useAuth } from "@/context/AuthContext";
import { Factory, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onCloseSidebar?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  onCloseSidebar,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { user } = useAuth();
  const role = user?.role ?? "Admin";

  const allowedKeys = ROLE_SIDEBAR_ACCESS[role] ?? [
    "dashboard",
    "assets",
    "devices",
    "signal",
    "ai",
  ];

  const visibleItems = SIDEBAR_ITEMS.filter((item) =>
    allowedKeys.includes(item.key)
  );

  return (
    <aside
      id="sidebar"
      className={`sticky top-0 z-40 h-screen transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      } bg-card text-card-foreground border-r border-border flex flex-col justify-between p-3 select-none shadow-lg`}
    >
      <div>
        {/* Brand Header */}
        <div className={`h-16 flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-1 pb-3 mb-3 border-b border-border`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center text-white shadow-md">
              <Factory className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-black text-lg tracking-tight bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-300 bg-clip-text text-transparent">
                  WMIND
                </span>
                <span className="text-[10px] tracking-widest uppercase text-muted-foreground font-bold truncate">
                  Pulp & Paper Mill
                </span>
              </div>
            )}
          </div>

          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 hidden lg:flex"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          )}
        </div>

        {/* OT Connectivity Badge */}
        {!isCollapsed ? (
          <div className="mb-4 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wide">
                Mill OT Online
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">5 PLCs</span>
          </div>
        ) : (
          <div className="mb-4 flex justify-center" title="Mill OT Online (5 PLCs)">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
        )}

        {/* Navigation Section */}
        {!isCollapsed && (
          <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Navigation
          </div>
        )}
        <nav className="space-y-1.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.key}
                to={item.path}
                id={`sidebar-${item.key}`}
                title={isCollapsed ? item.label : undefined}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    onCloseSidebar?.();
                  }
                }}
                className={({ isActive }) =>
                  `group relative flex items-center ${
                    isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3.5 py-2.5"
                  } rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={20}
                      className={`shrink-0 transition-colors duration-200 ${
                        isActive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Operator / User Pill at Bottom */}
      <div className="pt-3 border-t border-border">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-muted/50 border border-border">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              {user?.username ? user.username.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-foreground truncate">
                {user?.username || "Admin"}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span className="truncate">{user?.role || "Mill Engineer"}</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex justify-center"
            title={`${user?.username || "Admin"} (${user?.role || "Mill Engineer"})`}
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              {user?.username ? user.username.charAt(0).toUpperCase() : "A"}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
