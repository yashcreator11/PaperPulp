import apiAsset from "./axiosAsset";
import { MOCK_ASSET_HIERARCHY, MOCK_MAPPINGS } from "@/data/mockMillData";

/* --------------------------------------------------------
    TYPES
-------------------------------------------------------- */

// ------------------ Asset Hierarchy ------------------
export interface Asset {
  assetId: string;
  name: string;
  level: number;
  isDeleted: boolean;
  childrens: Asset[];
}

export interface InsertAssetRequest {
  parentId: string | null;
  name: string;
  level: number;
}

export interface UpdateAssetRequest {
  assetId: string;
  newName: string;
}

// ------------------ Asset Config ------------------
export interface UpdateAssetConfigPayload {
  signalName: string;
  signalAddress: string;
  signalType: string;
}

export interface AssetConfigPayload {
  assetId: string;
  signalName: string;
  signalAddress: string;
  signalType: string;
}

export interface SignalType {
  signalTypeID: string;
  signalName: string;
  signalUnit: string;
  defaultRegisterAdress: number;
  assetConfigurations: any[];
}

// ------------------ Mapping / Signals ------------------
export interface IMapping {
  signalId: string;       
  signalKey: string;
  assetId: string;
  deviceId: string;
  signalName: string;
  unit: string;
  createdAt: string;
  minThreshold: number;
  maxThreshold: number;
  registerId: string | null;
  opcUaNodeId: string | null;
}

// Payload for creating a single signal mapping (register OR opcUaNode)
export interface CreateMappingRegister {
  registerId: string;
  signalName: string;
  unit: string;
  minThreshold: number | null;
  maxThreshold: number | null;
}

export interface CreateMappingOpcUaNode {
  opcUaNodeId: string;
  signalName: string;
  unit: string;
  minThreshold: number | null;
  maxThreshold: number | null;
}

export interface CreateMappingPayload {
  assetId: string;
  deviceId: string;
  register?: CreateMappingRegister | null;
  opcUaNode?: CreateMappingOpcUaNode | null;
}

// ------------------ Notifications ------------------
export interface GlobalNotification {
  id: string;
  title: string;
  text: string;
  createdAt: string;
  expiresAt: string;
  priority: number;
}

export interface UserNotification {
  recipientId: string;
  notificationId: string;
  title: string;
  text: string;
  isRead: boolean;
  isAcknowledged: boolean;
  createdAt: string;
  readAt: string | null;
  acknowledgedAt: string | null;
}

// ------------------ Pagination ------------------
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}


/* --------------------------------------------------------
    HELPER FOR API ERRORS
-------------------------------------------------------- */
const handleApiError = (err: any, defaultMsg: string) => {
  return err?.response?.data || err?.message || defaultMsg;
};

/* --------------------------------------------------------
    ASSET HIERARCHY APIS
-------------------------------------------------------- */
export const getAssetHierarchy = async (): Promise<Asset[]> => {
  try {
    const res = await apiAsset.get("/AssetHierarchy/GetAssetHierarchy");
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data as Asset[];
    }
    return MOCK_ASSET_HIERARCHY;
  } catch (err) {
    console.warn("Using offline PaperPulp mock asset hierarchy:", err);
    return MOCK_ASSET_HIERARCHY;
  }
};

export const insertAsset = async (payload: InsertAssetRequest) => {
  try {
    const res = await apiAsset.post("/AssetHierarchy/InsertAsset", payload);
    return res.data;
  } catch (err) {
    throw handleApiError(err, "Failed to insert asset");
  }
};

export const getAssetsByParentId = async (parentId: string): Promise<Asset[]> => {
  try {
    const res = await apiAsset.get(`/AssetHierarchy/GetByParentId/${parentId}`);
    return res.data as Asset[];
  } catch (err) {
    throw handleApiError(err, `Failed to fetch children for parent ${parentId}`);
  }
};

export const deleteAsset = async (assetId: string) => {
  try {
    const res = await apiAsset.delete(`/AssetHierarchy/DeleteAsset/${assetId}`);
    return res.data;
  } catch (err) {
    throw handleApiError(err, `Failed to delete asset ${assetId}`);
  }
};

export const updateAsset = async (payload: UpdateAssetRequest) => {
  try {
    const res = await apiAsset.put("/AssetHierarchy/UpdateAsset", payload);
    return res.data;
  } catch (err) {
    throw handleApiError(err, "Failed to update asset");
  }
};

export const getDeletedAssets = async (): Promise<Asset[]> => {
  try {
    const res = await apiAsset.get("/AssetHierarchy/Deleted");
    return res.data as Asset[];
  } catch (err) {
    throw handleApiError(err, "Failed to fetch deleted assets");
  }
};

export const restoreAssetById = async (assetId: string) => {
  try {
    const res = await apiAsset.post(`/AssetHierarchy/Restore/${assetId}`);
    return res.data;
  } catch (err) {
    throw handleApiError(err, `Failed to restore asset ${assetId}`);
  }
};

/* --------------------------------------------------------
    ASSET CONFIG APIS
-------------------------------------------------------- */
export const addAssetConfig = async (payload: AssetConfigPayload) => {
  try {
    const res = await apiAsset.post("/AssetConfig", payload);
    return res.data;
  } catch (err) {
    throw handleApiError(err, "Failed to add asset config");
  }
};

export const getAssetConfig = async (assetId: string) => {
  try {
    const res = await apiAsset.get(`/AssetConfig/${assetId}`);
    return res.data;
  } catch (err) {
    throw handleApiError(err, `Failed to fetch asset config for ${assetId}`);
  }
};

export const updateAssetConfig = async (
  assetId: string,
  payload: UpdateAssetConfigPayload
) => {
  try {
    const res = await apiAsset.put(`/AssetConfig/${assetId}`, payload);
    return res.data;
  } catch (err) {
    throw handleApiError(err, `Failed to update asset config for ${assetId}`);
  }
};

export const getSignalTypes = async (): Promise<SignalType[]> => {
  try {
    const res = await apiAsset.get("/AssetConfig/SiganlTypes");
    return res.data as SignalType[];
  } catch (err) {
    throw handleApiError(err, "Failed to fetch signal types");
  }
};

/* --------------------------------------------------------
    MAPPING / SIGNAL APIS
-------------------------------------------------------- */

/**
 * Create a single signal mapping (register OR opcUaNode).
 * Called once per signal with min/max thresholds.
 * POST /mapping
 */
export const createMapping = async (payload: CreateMappingPayload): Promise<IMapping> => {
  try {
    const res = await apiAsset.post("/mapping", payload);
    return res.data.data as IMapping;
  } catch (err) {
    throw handleApiError(err, "Failed to create mapping");
  }
};

/**
 * Clear min/max thresholds for a signal.
 * PATCH /Mapping/{signalId}/thresholds/clear
 */
export const clearThresholds = async (signalId: string): Promise<IMapping> => {
  try {
    const res = await apiAsset.patch(`/Mapping/${signalId}/thresholds/clear`);
    return res.data.data as IMapping;
  } catch (err) {
    throw handleApiError(err, `Failed to clear thresholds for signal ${signalId}`);
  }
};

/**
 * Delete a mapping by ID.
 * DELETE /deletemap/{mappingId}
 */
export const deleteMapping = async (mappingId: string): Promise<void> => {
  try {
    await apiAsset.delete(`/deletemap/${mappingId}`);
  } catch (err) {
    throw handleApiError(err, `Failed to delete mapping ${mappingId}`);
  }
};

function findAssetRecursive(nodes: Asset[], id: string): Asset | null {
  for (const n of nodes) {
    if (n.assetId === id) return n;
    if (n.childrens?.length) {
      const found = findAssetRecursive(n.childrens, id);
      if (found) return found;
    }
  }
  return null;
}

function collectSignalsRecursive(node: Asset): IMapping[] {
  const result: IMapping[] = [];
  if (MOCK_MAPPINGS[node.assetId]) {
    result.push(...MOCK_MAPPINGS[node.assetId]);
  }
  if (node.childrens?.length) {
    for (const c of node.childrens) {
      result.push(...collectSignalsRecursive(c));
    }
  }
  return result;
}

export const getSignalOnAsset = async (assetId: string): Promise<IMapping[]> => {
  try {
    const res = await apiAsset.get(`/Mapping/mappings/${assetId}`);
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data as IMapping[];
    }
  } catch (err) {
    // Fall back to local mill digital twin
  }

  // 1. Exact mapping
  if (MOCK_MAPPINGS[assetId] && MOCK_MAPPINGS[assetId].length > 0) {
    return MOCK_MAPPINGS[assetId];
  }

  // 2. Hierarchical aggregation for parent lines or departments
  const targetNode = findAssetRecursive(MOCK_ASSET_HIERARCHY, assetId);
  if (targetNode) {
    const aggregated = collectSignalsRecursive(targetNode);
    if (aggregated.length > 0) {
      return aggregated;
    }
  }

  // 3. Fallback: generate realistic industrial signals for this equipment
  const assetName = targetNode?.name || "Equipment";
  return [
    {
      signalId: `sig-${assetId}-speed`,
      signalKey: `${assetName}.Speed`,
      signalName: `${assetName} Drive Speed`,
      unit: "m/min",
      assetId: assetId,
      deviceId: "dev-pm-qcs",
      minThreshold: 800,
      maxThreshold: 1200,
      createdAt: new Date().toISOString(),
      registerId: "reg-1",
      opcUaNodeId: null,
    },
    {
      signalId: `sig-${assetId}-temp`,
      signalKey: `${assetName}.Temperature`,
      signalName: `${assetName} Operating Temp`,
      unit: "°C",
      assetId: assetId,
      deviceId: "dev-pm-qcs",
      minThreshold: 45,
      maxThreshold: 180,
      createdAt: new Date().toISOString(),
      registerId: "reg-2",
      opcUaNodeId: null,
    },
    {
      signalId: `sig-${assetId}-press`,
      signalKey: `${assetName}.Pressure`,
      signalName: `${assetName} Line Pressure`,
      unit: "bar",
      assetId: assetId,
      deviceId: "dev-pm-qcs",
      minThreshold: 2.5,
      maxThreshold: 12.0,
      createdAt: new Date().toISOString(),
      registerId: "reg-3",
      opcUaNodeId: null,
    },
    {
      signalId: `sig-${assetId}-vib`,
      signalKey: `${assetName}.Vibration`,
      signalName: `${assetName} Vibration Severity`,
      unit: "mm/s",
      assetId: assetId,
      deviceId: "dev-pm-qcs",
      minThreshold: 0.1,
      maxThreshold: 3.5,
      createdAt: new Date().toISOString(),
      registerId: "reg-4",
      opcUaNodeId: null,
    },
  ];
};

export const getMappingById = async (id: string): Promise<IMapping[]> => {
  try {
    const res = await apiAsset.get(`/Mapping/signals/${id}`);
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data as IMapping[];
    }
    return MOCK_MAPPINGS[id] || [];
  } catch (err) {
    return MOCK_MAPPINGS[id] || [];
  }
};

/* --------------------------------------------------------
    NOTIFICATIONS APIS
-------------------------------------------------------- */

export const getAllNotifications = async (params?: {
  limit?: number;
  cursor?: string | null;
}): Promise<PaginatedResponse<GlobalNotification>> => {
  try {
    const res = await apiAsset.get("/Notifications/all", {
      params: {
        limit: params?.limit ?? 10,
        cursor: params?.cursor ?? undefined,
      },
    });
    return res.data as PaginatedResponse<GlobalNotification>;
  } catch (err) {
    throw handleApiError(err, "Failed to fetch notifications");
  }
};

export const getMyNotifications = async (params: {
  unread?: boolean;
  limit?: number;
  cursor?: string | null;
}): Promise<PaginatedResponse<UserNotification>> => {
  try {
    const res = await apiAsset.get("/Notifications/my", {
      params: {
        unread: params.unread,
        limit: params.limit ?? 10,
        cursor: params.cursor ?? undefined,
      },
    });
    return res.data as PaginatedResponse<UserNotification>;
  } catch (err) {
    throw handleApiError(err, "Failed to fetch my notifications");
  }
};

export const markNotificationAsRead = async (id: string) => {
  try {
    await apiAsset.post(`/Notifications/read/${id}`);
  } catch (err) {
    throw handleApiError(err, `Failed to mark notification ${id} as read`);
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    await apiAsset.post("/Notifications/readall");
  } catch (err) {
    throw handleApiError(err, "Failed to mark all notifications as read");
  }
};

export const acknowledgeNotification = async (id: string) => {
  try {
    await apiAsset.post(`/Notifications/ack/${id}`);
  } catch (err) {
    throw handleApiError(err, `Failed to acknowledge notification ${id}`);
  }
};

export const createNotification = async (payload: { title: string; text: string; priority?: number }) => {
  try {
    const res = await apiAsset.post("/Notifications/send", {
      title: payload.title,
      text: payload.text,
      priority: payload.priority ?? 1,
    });
    return res.data;
  } catch (err) {
    throw handleApiError(err, "Failed to send notification to database");
  }
};

/* --------------------------------------------------------
    REPORT APIS
-------------------------------------------------------- */

export const getRequestedReports = async () => {
  try {
    const response = await apiAsset.get("/Reports");
    return response.data;
  } catch (err) {
    throw handleApiError(err, "Failed to fetch report history");
  }
};

export const requestAssetReport = async (payload: {
  assetID: string;
  signalIDs: string[];
  startDate: string;
  endDate: string;
  reportFormat: string;
}) => {
  try {
    await apiAsset.post("/Reports/ReportRequest", payload);
  } catch (err) {
    throw handleApiError(err, "Failed to request report");
  }
};

export const downloadAssetReport = async (reportId: string) => {
  try {
    const response = await apiAsset.get(`/Reports/download/${reportId}`, {
      responseType: "blob",
    });
    return response.data;
  } catch (err) {
    throw handleApiError(err, "Failed to download report");
  }
};