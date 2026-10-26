// src/tour/userManagementTour.ts

export const userManagementTour = [
  {
    element: "#user-search",
    popover: {
      title: "Search Users",
      description: "Use this search bar to filter users by username, email, or role.",
    },
  },

  {
    element: "#download-csv-btn",
    popover: {
      title: "Download CSV",
      description: "Admins can download all filtered users into a CSV file.",
    },
  },

  {
    element: "#user-table",
    popover: {
      title: "User List",
      description: "Here you can see all users along with their details.",
    },
  },

  {
    element: ".role-dropdown",
    popover: {
      title: "Update User Role",
      description: "Admins can change the role of a user using this dropdown.",
    },
  },

  {
    element: ".delete-user-btn",
    popover: {
      title: "Delete User",
      description: "Admins can delete a user using this button.",
    },
  },
];
