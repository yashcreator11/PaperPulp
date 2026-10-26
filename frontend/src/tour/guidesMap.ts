// src/tour/guidesMap.ts

import { dashboardTour } from "./dashboardTour";
import { devicesTour } from "./deviceTour";
import { assetsTour } from "./assetTour";
import { userManagementTour } from "./userManagementTour";
import { deletedDevicesTour } from "./deletedDeviceTour";
import { deletedAssetsTour } from "./deletedAssetTour";
import { signalTour } from "./signalTour";
import { reportTour } from "./reportTour";

export const guidesMap: Record<string, any> = {
  "/dashboard": dashboardTour,
  "/devices": devicesTour,
  "/assets": assetsTour,
  "/manage-user": userManagementTour,
  "/deleted-devices": deletedDevicesTour,
  "/deleted-assets": deletedAssetsTour,
  "/signal": signalTour,
  "/signals": signalTour,
  "/reports": reportTour,
};
