// src/config/sidebarItems.tsx
import {
  LayoutDashboard,
  Layers,
  Cpu,
  Activity,
  Bot,
} from "lucide-react";

export const SIDEBAR_ITEMS = [
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", section: "Main" },
  { key: "assets", icon: Layers, label: "Asset Hierarchy", path: "/assets", section: "Operations" },
  { key: "devices", icon: Cpu, label: "OT Devices & PLCs", path: "/devices", section: "Operations" },
  { key: "signal", icon: Activity, label: "Signal Monitor", path: "/signal", section: "Intelligence" },
  { key: "ai", icon: Bot, label: "AI Copilot & RCA", path: "/ai", section: "Intelligence" },
];
