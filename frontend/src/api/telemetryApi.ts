// src/api/telemetryApi.ts
import axios from "axios";
import { generateMockTelemetry } from "@/data/mockMillData";

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/asset`

export interface TelemetryPoint {
  time: string;
  value: number;
}

export interface TelemetryStats {
  count: number;
  min: number;
  max: number;
  average: number;
  firstValue: number;
  lastValue: number;
  firstTimestamp: string;
  lastTimestamp: string;
}

export interface TelemetryResponse {
  assetId: string;
  deviceId: string;
  signalId: string;
  signalName: string;
  unit: string;
  timeRange: string;
  startTime: string;
  endTime: string;
  values: TelemetryPoint[];
  stats: TelemetryStats | null;
}

export const TimeRange = {
  LastHour: 0,
  Last6Hours: 1,
  Last24Hours: 2,
  Last7Days: 3,
  Last30Days: 4,
  Custom: 5,
} as const;

export type TimeRange = typeof TimeRange[keyof typeof TimeRange];

export interface TelemetryRequest {
  assetId: string;
  signalId: string;       // ✅ was signalTypeId
  timeRange: TimeRange;
  startDate?: string;
  endDate?: string;
  signalName?: string;
  unit?: string;
}

export interface RawTelemetryRequest {
  assetId: string;
  signalId: string;       // ✅ was signalTypeId
  startDate: string;
  endDate: string;
  timeRange: TimeRange;   // must be Custom (5)
  signalName?: string;
  unit?: string;
}


// 🔥 Fetch telemetry data
export const getTelemetryData = async (
  request: TelemetryRequest
): Promise<TelemetryResponse> => {
  try {
    const response = await axios.post<TelemetryResponse>(
      `${API_BASE_URL}/TelemetryTest/query`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    const label = request.signalName || request.signalId;
    const unit = request.unit || (label.toLowerCase().includes("temp") ? "°C" : label.toLowerCase().includes("press") ? "bar" : label.toLowerCase().includes("speed") ? "m/min" : "%");
    const mock = generateMockTelemetry(label, unit, 40);
    return {
      assetId: request.assetId,
      deviceId: "dev-pm-qcs",
      signalId: request.signalId,
      signalName: request.signalName || request.signalId,
      unit: unit,
      timeRange: String(request.timeRange),
      startTime: mock.values[0]?.time || new Date().toISOString(),
      endTime: mock.values[mock.values.length - 1]?.time || new Date().toISOString(),
      values: mock.values,
      stats: mock.stats,
    };
  }
};

export const getRawTelemetryData = async (
  request: RawTelemetryRequest
): Promise<TelemetryResponse> => {
  try {
    const response = await axios.post<TelemetryResponse>(
      `${API_BASE_URL}/TelemetryTest/queryraw`,
      request,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    const mock = generateMockTelemetry(request.signalId, "unit", 60);
    return {
      assetId: request.assetId,
      deviceId: "dev-pm-qcs",
      signalId: request.signalId,
      signalName: request.signalId,
      unit: request.signalId.includes("Temp") ? "°C" : request.signalId.includes("Press") ? "bar" : "%",
      timeRange: "Custom",
      startTime: request.startDate,
      endTime: request.endDate,
      values: mock.values,
      stats: mock.stats,
    };
  }
};


export const getLastHourData = async (
  assetId: string,
  signalId: string
): Promise<TelemetryResponse> => {
  try {
    const response = await axios.get<TelemetryResponse>(
      `${API_BASE_URL}/TelemetryTest/last-hour`,
      { params: { assetId, signalId } }
    );
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch last hour data:", error);
    throw new Error(error.response?.data?.error || "Failed to fetch data");
  }
};

export const getLast24HoursData = async (
  assetId: string,
  signalId: string
): Promise<TelemetryResponse> => {
  try {
    const response = await axios.get<TelemetryResponse>(
      `${API_BASE_URL}/TelemetryTest/last-24-hours`,
      { params: { assetId, signalId } }
    );
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch last 24 hours data:", error);
    throw new Error(error.response?.data?.error || "Failed to fetch data");
  }
};

export const getLast7DaysData = async (
  assetId: string,
  signalId: string
): Promise<TelemetryResponse> => {
  try {
    const response = await axios.get<TelemetryResponse>(
      `${API_BASE_URL}/TelemetryTest/last-7-days`,
      { params: { assetId, signalId } }
    );
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch last 7 days data:", error);
    throw new Error(error.response?.data?.error || "Failed to fetch data");
  }
};

export const getCustomRangeData = async (
  assetId: string,
  signalId: string,
  startDate: string,
  endDate?: string
): Promise<TelemetryResponse> => {
  try {
    const response = await axios.get<TelemetryResponse>(
      `${API_BASE_URL}/TelemetryTest/custom-range`,
      { params: { assetId, signalId, startDate, endDate } }
    );
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch custom range data:", error);
    throw new Error(error.response?.data?.error || "Failed to fetch data");
  }
};