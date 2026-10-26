// src/tours/reportTour.ts
export const reportTour = [
  {
    element: "#report-date",
    popover: {
      title: "Select Date",
      description: "Choose the date for which you want to see the signal report."
    }
  },
  {
    element: "#report-asset",
    popover: {
      title: "Select Asset",
      description: "Pick an asset to load available signals."
    }
  },
  {
  element: "#report-signal",
  popover: {
    title: "Select Signal",
    description: "Choose a specific signal related to the selected asset."
  }
},
  {
    element: "#report-device",
    popover: {
      title: "Assigned Device",
      description: "Here you can see which device is mapped to the selected asset."
    }
  },
  {
    element: "#report-alerts",
    popover: {
      title: "Show Only Alerts",
      description: "Enable this to filter only high-priority signal alerts."
    }
  },
  {
    element: "#generate-report-btn",
    popover: {
      title: "Generate Report",
      description: "Click to generate the signal report."
    }
  },
  {
    element: "#download-csv-btn",
    popover: {
      title: "Download CSV",
      description: "Export your report in CSV format."
    }
  },
  {
    element: "#download-pdf-btn",
    popover: {
      title: "Download PDF",
      description: "Export your report as a PDF."
    }
  },
  {
    element: "#report-table",
    popover: {
      title: "Report Table",
      description: "Your generated signal records will appear here."
    }
  }
];
