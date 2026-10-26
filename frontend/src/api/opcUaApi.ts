import api from "./axios";

/**
 * DTOs matching backend responses
 */

export interface OpcUaNode {
  id?: string; // GUID from backend
  nodeId: string;
  signalName?: string;
  dataType?: string;
  unit?: string;
  scalingFactor?: number;
}

export interface CreateOpcUaNodeRequest {
  nodeId: string;
  signalName?: string;
  dataType?: string;
  unit?: string;
  scalingFactor?: number;
}

/**
 * ---------------------------------
 * OPC UA NODE APIs
 * ---------------------------------
 */

/**
 * 1️⃣ Create OPC UA Node
 * POST /api/devices/{deviceId}/opcua-nodes
 */
export const createOpcUaNode = async (
  deviceId: string,
  data: CreateOpcUaNodeRequest
): Promise<string> => {
  const response = await api.post(
    `/devices/${deviceId}/opcua-nodes`,
    data
  );

  return response.data.data.opcUaNodeId;
};

/**
 * 2️⃣ Get All OPC UA Nodes for Device
 * GET /api/devices/{deviceId}/opcua-nodes
 */
export const getOpcUaNodes = async (
  deviceId: string
): Promise<OpcUaNode[]> => {
  const response = await api.get(
    `/devices/${deviceId}/opcua-nodes`
  );

  return response.data.data;
};

/**
 * 3️⃣ Get Single OPC UA Node
 * GET /api/devices/{deviceId}/opcua-nodes/{nodeGuid}
 */
export const getSingleOpcUaNode = async (
  deviceId: string,
  nodeGuid: string
): Promise<OpcUaNode> => {
  const response = await api.get(
    `/devices/${deviceId}/opcua-nodes/${nodeGuid}`
  );

  return response.data.data;
};

/**
 * 4️⃣ Update OPC UA Node
 * PUT /api/devices/{deviceId}/opcua-nodes/{nodeGuid}
 */
export const updateOpcUaNode = async (
  deviceId: string,
  nodeGuid: string,
  data: CreateOpcUaNodeRequest
): Promise<void> => {
  await api.put(
    `/devices/${deviceId}/opcua-nodes/${nodeGuid}`,
    data
  );
};

/**
 * 5️⃣ Delete OPC UA Node
 * DELETE /api/devices/{deviceId}/opcua-nodes/{nodeGuid}
 */
export const deleteOpcUaNode = async (
  deviceId: string,
  nodeGuid: string
): Promise<void> => {
  await api.delete(
    `/devices/${deviceId}/opcua-nodes/${nodeGuid}`
  );
};

/**
 * ---------------------------------
 * FRONTEND SEARCH HELPER
 * ---------------------------------
 */

export const searchOpcUaNodes = (
  nodes: OpcUaNode[],
  searchTerm: string
): OpcUaNode[] => {
  if (!searchTerm) return nodes;

  const term = searchTerm.toLowerCase();

  return nodes.filter(
    (n) =>
      n.nodeId.toLowerCase().includes(term) ||
      (n.signalName || "").toLowerCase().includes(term)
  );
};
