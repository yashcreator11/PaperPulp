export type UserRole = "Admin" | "Engineer" | "Operator" | "User" | "Viewer";

export const ROLE_SIDEBAR_ACCESS: Record<string, string[]> = {
  Admin: [
    "dashboard",
    "assets",
    "devices",
    "signal",
    "ai",
  ],

  Engineer: [
    "dashboard",
    "assets",
    "devices",
    "signal",
    "ai",
  ],

  Operator: [
    "dashboard",
    "assets",
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
    "signal",
    "ai",
  ]
};
