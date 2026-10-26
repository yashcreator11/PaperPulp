import { createApiClient } from "./apiClient";
export default createApiClient(`${import.meta.env.VITE_API_URL}/api/ai`);