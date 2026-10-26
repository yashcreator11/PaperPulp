import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("wmind_sidebar_collapsed") === "true";
  });

  const handleToggle = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem("wmind_sidebar_collapsed", String(next));
        return next;
      });
    }
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("wmind_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform 
        transition-all duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          onCloseSidebar={() => setSidebarOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Right Section */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">

        {/* Topbar */}
        <div className="shrink-0">
          <Topbar onToggleSidebar={handleToggle} />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-2 md:p-3">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
