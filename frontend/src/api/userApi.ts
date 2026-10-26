import authApi from "./authApi"; 
import axios from "axios";

export const getAllUsers = async () => {
  const res = await authApi.get("/User");
  return res.data;
};

export const getUserById = async (id: string | number) => {
  const res = await authApi.get(`/User/${id}`);
  return res.data;
};

export const getCurrentUser = async () => {
  const res = await authApi.get("/User/me");
  return res.data;
};

export const updateUser = async (id: string | number, payload: any) => {
  const res = await authApi.put(`/User/${id}`, payload);
  return res.data;
};

export const deleteUser = async (id: string | number) => {
  const res = await authApi.delete(`/User/${id}`);
  return res.data;
};

// ---------------------- NEW TOUR ENDPOINTS ----------------------

export const getTourStatus = async () => {
  const res = await authApi.get("/User/tour-status");
  return res.data; // returns { isTourCompleted: boolean }
};

export const markTourCompleted = async () => {
  const res = await authApi.post("/User/complete-tour");
  return res.data; // returns {}
};

export const ChangeUserRole = async (id: number, payload: any) => {
  try {
    const res = await authApi.patch(`/User/${id}/role`, payload);
    return res.data;
  } catch (error: any) {
    
    if (axios.isAxiosError(error)) {
     console.log(error)
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Something went wrong";

      throw new Error(message);
    }

    throw new Error("Unexpected error occurred");
  }
};