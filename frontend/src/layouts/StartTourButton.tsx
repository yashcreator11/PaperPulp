// 📌 StartTourButton.tsx

import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { useTour } from "../hooks/use-tour";
import { useEffect } from "react";

import { getTourStatus, markTourCompleted } from "@/api/userApi";

import {
  PAGE_TOUR_KEY,
  BACKEND_TOUR_KEY,
  getPageTourState,
  markPageCompleted,
  getBackendTourStatus,
  setBackendTourDone
} from "../hooks/tourStorage";

import { dashboardTour } from "../tour/dashboardTour";
import { devicesTour } from "../tour/deviceTour";
import { assetsTour } from "@/tour/assetTour";
import { userManagementTour } from "@/tour/userManagementTour";
import { deletedItemsTour } from "@/tour/deletedItemsTour";
import { signalTour } from "@/tour/signalTour";
import { reportTour } from "@/tour/reportTour";
import { notificationsTour } from "@/tour/notificationTour";

import { Info } from "lucide-react";

export default function StartTourButton() {
  const location = useLocation();
  const { startTour } = useTour();

  // ----------- Identify current page ---------------
  const getPageKey = () => {
    if (location.pathname.startsWith("/dashboard")) return "dashboard";
    if (location.pathname.startsWith("/devices")) return "devices";
    if (location.pathname.startsWith("/assets")) return "assets";
    if (location.pathname.startsWith("/manage-user")) return "user-management";
    if (location.pathname.startsWith("/deleted-items")) return "deleted-items";
    if (location.pathname.startsWith("/signal")) return "signal";
    if (location.pathname.startsWith("/reports")) return "reports";
    if (location.pathname.startsWith("/notifications")) return "notifications";
    return null;
  };

  const ALL_PAGES = [
    "dashboard",
    "devices",
    "assets",
    "user-management",
    "deleted-items",
    "notifications",
    "signal",
    "reports",
  ];

  // ----------- Steps for page ---------------
  const getStepsForPage = () => {
    if (location.pathname.startsWith("/dashboard")) return dashboardTour;
    if (location.pathname.startsWith("/devices")) return devicesTour;
    if (location.pathname.startsWith("/assets")) return assetsTour;
    if (location.pathname.startsWith("/manage-user")) return userManagementTour;
    if (location.pathname.startsWith("/deleted-items")) return deletedItemsTour;
    if (location.pathname.startsWith("/signal")) return signalTour;
    if (location.pathname.startsWith("/reports")) return reportTour;
    if (location.pathname.startsWith("/notifications")) return notificationsTour;
    return null;
  };

  // ⭐ AUTO TOUR BASED ON BACKEND
  useEffect(() => {
    const autoStart = async () => {
      let backendTourDone = getBackendTourStatus();

      // First time → GET from backend
      if (backendTourDone === null) {
        try {
          const { isTourCompleted } = await getTourStatus();
          backendTourDone = isTourCompleted ? "true" : "false";
          localStorage.setItem(BACKEND_TOUR_KEY, backendTourDone);
        } catch (err) {
          console.error("Backend fetch failed:", err);
          return;
        }
      }

      // If backend says tour is completed → stop auto-tour
      if (backendTourDone === "true") return;

      const pageKey = getPageKey();
      if (!pageKey) return;

      const pageState = getPageTourState();

      // If this page is already shown → skip
      if (pageState[pageKey]) return;

      const steps = getStepsForPage();
      if (!steps) return;

      // Run auto tour
      startTour(steps);

      // Mark page completed
      markPageCompleted(pageKey);

      // Check if every page is done
      const allDone = ALL_PAGES.every((p) => pageState[p] || p === pageKey);

      if (allDone) {
        await markTourCompleted();
        setBackendTourDone();
      }
    };

    autoStart();
  }, [location.pathname]);

  const handleStartTour = () => {
    const steps = getStepsForPage();
    if (steps) startTour(steps);
    else alert("No tour available!");
  };

  return (
    <Button onClick={handleStartTour} variant="ghost"
   className="text-sm" title="Start Tour">
      <Info className="w-6 h-6 text-foreground" />
    </Button>
  );
}
