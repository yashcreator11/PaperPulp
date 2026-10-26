// src/tour/notificationsTour.ts

export const notificationsTour = [
  // ===============================
  // 📢 PAGE TITLE
  // ===============================
  {
    element: "#notifications-title",
    popover: {
      title: "Notifications",
      description:
        "This page shows all alerts, warnings, and system notifications related to your assets and devices.",
    },
  },

  // ===============================
  // ❌ CLOSE BUTTON
  // ===============================
  {
    element: "#notifications-close-btn",
    popover: {
      title: "Close Notifications",
      description:
        "Click here to close the notifications panel and return to the previous screen.",
    },
  },

  // ===============================
  // 🔍 FILTER — ALL
  // ===============================
  {
    element: "#notif-filter-all",
    popover: {
      title: "All Notifications",
      description:
        "View all notifications including read and unread alerts.",
    },
  },

  // ===============================
  // 🔔 FILTER — UNREAD
  // ===============================
  {
    element: "#notif-filter-unread",
    popover: {
      title: "Unread Notifications",
      description:
        "See only unread notifications that still require your attention.",
    },
  },

  // ===============================
  // ✅ FILTER — READ
  // ===============================
  {
    element: "#notif-filter-read",
    popover: {
      title: "Read Notifications",
      description:
        "View notifications that you have already read.",
    },
  },

  // ===============================
  // 📋 NOTIFICATION LIST
  // ===============================
  {
    element: "#notification-list",
    popover: {
      title: "Notification List",
      description:
        "This section displays detailed notifications including alerts, status changes, and system messages.",
    },
  },
];
