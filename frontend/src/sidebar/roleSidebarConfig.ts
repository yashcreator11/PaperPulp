export type UserRole = "Admin" | "Engineer" | "Operator" | "User" | "Viewer";

export const ROLE_SIDEBAR_ACCESS: Record<string, string[]> = {
  Admin: [
    "dashboard",
    "assets",
    "simulator",
    "devices",
    "signal",
    "ai",
  ],

  Engineer: [
    "dashboard",
    "assets",
    "simulator",
    "devices",
    "signal",
    "ai",
  ],

  Operator: [
    "dashboard",
    "assets",
    "simulator",
    "signal",
    "ai",
  ],

  User: [
    "dashboard",
    "assets",
    "signal",
  ],

  Viewer: [
    "dashboard",
    "assets",
    "simulator",
    "signal",
    "ai",
  ]
};
