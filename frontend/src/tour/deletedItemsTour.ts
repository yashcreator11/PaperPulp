// src/tour/deletedItemsTour.ts

export const deletedItemsTour = [
  // ===============================
  // 🔍 COMMON SEARCH
  // ===============================
  {
    element: "#deleted-item-device",
    popover: {
      title: "Search Deleted Device",
      description:
        "Use this search bar to quickly find deleted devices.",
    },
  },

  // ===============================
  // 📋 DELETED DEVICES
  // ===============================
  {
    element: "#deleted-device-table",
    popover: {
      title: "Deleted Devices List",
      description:
        "This table shows all devices that were deleted from the system.",
    },
  },

  {
    element: ".retrieve-device-btn",
    popover: {
      title: "Retrieve Device",
      description:
        "Admins can restore a deleted device back into the system using this button.",
    },
  },

  // ===============================
  // 📋 DELETED ASSETS
  // ===============================
  {
    element: "#deleted-item-asset",
    popover: {
      title: "Search Deleted Asset",
      description:
        "Use this search bar to quickly find deleted assets.",
    },
  },
  {
    element: "#deleted-asset-table",
    popover: {
      title: "Deleted Assets List",
      description:
        "This table shows all assets that were deleted from the system.",
    },
  },

  {
    element: ".restore-asset-btn",
    popover: {
      title: "Restore Asset",
      description:
        "Admins can restore a deleted asset back into the asset hierarchy using this button.",
    },
  },
];
