import api from "./axios";

/**
 * DTOs matching backend responses
 */

export interface Gateway {
  name: string;
  clientId: string;
}

export interface GatewayCredentialsResponse {
  message: string;
  clientId: string;
  clientSecret: string;
  rabbitMqUsername: string;
  rabbitMqPassword: string;
  caCertificateBase64: string;
}

/**
 * Fetch all gateways
 * GET /api/Gateway
 */
export const getGateways = async (): Promise<Gateway[]> => {
  const response = await api.get("/Gateway");
  return response.data;
};

/**
 * Add a new gateway
 * POST /api/Gateway/{name}
 */
export const addGateway = async (
  gatewayName: string
): Promise<GatewayCredentialsResponse> => {
  if (!gatewayName || !gatewayName.trim()) {
    throw new Error("Gateway name is required");
  }

  const response = await api.post(
    `/Gateway/${encodeURIComponent(gatewayName.trim())}`
  );

  return response.data;
};



/**
 * Frontend-only search helper
 */
export const searchGateways = (
  gateways: Gateway[],
  searchTerm: string
): Gateway[] => {
  if (!searchTerm) return gateways;

  const term = searchTerm.toLowerCase();

  return gateways.filter(
    (g) =>
      g.name.toLowerCase().includes(term) ||
      g.clientId.toLowerCase().includes(term)
  );
};

/**
 * Update gateway name
 * PUT /api/Gateway/{clientId}/{newGatewayName}
 */
export const updateGatewayName = async (
  clientId: string,
  newGatewayName: string
): Promise<GatewayCredentialsResponse> => {
  if (!clientId?.trim())
    throw new Error("Client ID is required");

  if (!newGatewayName?.trim())
    throw new Error("New gateway name is required");

  const response = await api.put(
    `/Gateway/${encodeURIComponent(clientId)}/${encodeURIComponent(newGatewayName.trim())}`
  );

  return response.data;
};

/**
 * Delete a gateway
 * DELETE /api/Gateway/{clientId}
 */
export const deleteGateway = async (clientId: string): Promise<string> => {
  if (!clientId?.trim())
    throw new Error("Client ID is required");

  const response = await api.delete(
    `/Gateway/${encodeURIComponent(clientId)}`
  );

  return response.data;
};

/**
 * Refresh client secret
 * PUT /api/Gateway/refresh-secret/{clientId}
 */
export const refreshClientSecret = async (
  clientId: string
): Promise<GatewayCredentialsResponse> => {
  if (!clientId?.trim()) throw new Error("Client ID is required");

  const response = await api.put(
    `/Gateway/refresh-secret/${encodeURIComponent(clientId)}`
  );

  return response.data;
};