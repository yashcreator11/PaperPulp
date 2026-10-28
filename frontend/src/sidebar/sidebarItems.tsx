// src/config/sidebarItems.tsx
import {
  LayoutDashboard,
  Layers,
  Cpu,
  Activity,
  Bot,
  SlidersHorizontal,
} from "lucide-react";

export const SIDEBAR_ITEMS = [
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", section: "Main" },
  { key: "assets", icon: Layers, label: "Asset Hierarchy", path: "/assets", section: "Operations" },
  { key: "simulator", icon: SlidersHorizontal, label: "Process Simulator", path: "/simulator", section: "Simulation" },
  { key: "devices", icon: Cpu, label: "OT Devices & PLCs", path: "/devices", section: "Operations" },
  { key: "signal", icon: Activity, label: "Signal Monitor", path: "/signal", section: "Intelligence" },
  { key: "ai", icon: Bot, label: "AI Copilot & RCA", path: "/ai", section: "Intelligence" },
];
