import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useNotifications } from "./NotificationContext";

export type ProcessPhase = "nominal" | "ramping" | "excursion" | "settling";

export interface LiveSignalState {
  signalId: string;
  signalName: string;
  unit: string;
  currentValue: number;
  baseline: number;
  targetValue: number;
  minThreshold: number;
  maxThreshold: number;
  history: number[];
  status: "normal" | "warning" | "critical";
  deviationPercent: number;
  phase: ProcessPhase;
  rateOfChange: number; // dy/dt in units/sec
  alarmFired: boolean;
  isPrimarySource?: boolean;
  inducedBy?: string | null;
  couplingGain?: number;
  lagRemainingTicks?: number;
  assetId: string;
  assetName: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  targetAssetId: string;
  primarySignalId: string;
  type: "vacuum_drop" | "draw_slip" | "steam_sag" | "vibration_spike";
}

interface SimulationContextType {
  signalsByAsset: Record<string, LiveSignalState[]>;
  getSignalsForAsset: (assetId: string, assetName: string) => LiveSignalState[];
  injectDisturbance: (assetId: string, signalId: string, direction?: "high" | "low") => void;
  engagePidControl: (assetId?: string, signalId?: string) => void;
  setManualValue: (assetId: string, signalId: string, value: number) => void;
  injectPresetScenario: (scenarioId: string) => void;
  resetAllToNominal: () => void;
  activeDisturbancesCount: number;
  activeExcursions: LiveSignalState[];
  allAssets: Array<{ assetId: string; assetName: string }>;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

// Default Pre-Configured Assets in PaperPulp Integrated Mill
const MILL_ASSETS = [
  { assetId: "PM-PM1", assetName: "Paper Machine 1 Main Section" },
  { assetId: "PM-PM1-W01", assetName: "Fourdrinier Forming Table PM-PM1-W01" },
  { assetId: "PM-PM1-P01", assetName: "3-Nip Press Section PM-PM1-P01" },
  { assetId: "PM-PM1-D01", assetName: "Dryer Cylinder Section PM-PM1-D01" },
  { assetId: "PM-PM1-H01", assetName: "Headbox Approach Flow PM-PM1-H01" },
  { assetId: "PM-PM1-R01", assetName: "Calender and Pope Reel PM-PM1-R01" },
  { assetId: "CR-CR3-F01", assetName: "Kraft Recovery Boiler CR-CR3-F01" },
  { assetId: "FL-DIG-V01", assetName: "Continuous Digester FL-DIG-V01" },
  { assetId: "FL-BSW-W01", assetName: "Brownstock Drum Washer FL-BSW-W01" },
];

function generateDefaultSignals(assetId: string, assetName: string): LiveSignalState[] {
  const lower = assetName.toLowerCase();
  let raw: Array<{ id: string; name: string; unit: string; min: number; max: number }> = [];

  if (lower.includes("dryer") || lower.includes("steam") || lower.includes("boiler")) {
    raw = [
      { id: `sig-${assetId}-steam-p`, name: `${assetName} Steam Header Pressure`, unit: "bar", min: 6.0, max: 13.5 },
      { id: `sig-${assetId}-dryer-temp`, name: `${assetName} Cylinder Surface Temp`, unit: "°C", min: 105, max: 138 },
      { id: `sig-${assetId}-condensate`, name: `${assetName} Condensate Syphon Flow`, unit: "m³/h", min: 12, max: 28 },
    ];
  } else if (lower.includes("press") || lower.includes("couch") || lower.includes("wire") || lower.includes("forming") || lower.includes("paper")) {
    raw = [
      { id: `sig-${assetId}-vacuum`, name: `${assetName} Couch Roll Vacuum`, unit: "kPa", min: 45, max: 68 },
      { id: `sig-${assetId}-draw`, name: `${assetName} Press-to-Dryer Draw`, unit: "%", min: 1.8, max: 3.8 },
      { id: `sig-${assetId}-torque`, name: `${assetName} Sectional Drive Torque`, unit: "%", min: 40, max: 85 },
    ];
  } else if (lower.includes("digester") || lower.includes("cook")) {
    raw = [
      { id: `sig-${assetId}-pressure`, name: `${assetName} Top Separator Pressure`, unit: "bar", min: 7.5, max: 12.0 },
      { id: `sig-${assetId}-temp`, name: `${assetName} Cook Zone Temperature`, unit: "°C", min: 155, max: 172 },
      { id: `sig-${assetId}-flow`, name: `${assetName} Blow Line Liquor Flow`, unit: "m³/h", min: 180, max: 260 },
    ];
  } else {
    raw = [
      { id: `sig-${assetId}-speed`, name: `${assetName} Operating Speed`, unit: "m/min", min: 850, max: 1150 },
      { id: `sig-${assetId}-load`, name: `${assetName} Motor Drive Load`, unit: "%", min: 35, max: 80 },
      { id: `sig-${assetId}-vibration`, name: `${assetName} Bearing RMS Vibration`, unit: "mm/s", min: 1.2, max: 4.5 },
    ];
  }

  return raw.map((item) => {
    const mid = (item.min + item.max) / 2;
    const history: number[] = [];
    for (let i = 0; i < 20; i++) {
      const noise =
        Math.sin(i / 2) * (item.max - item.min) * 0.05 +
        (Math.random() - 0.5) * (item.max - item.min) * 0.03;
      history.push(Number((mid + noise).toFixed(2)));
    }

    return {
      signalId: item.id,
      signalName: item.name,
      unit: item.unit,
      currentValue: history[history.length - 1],
      baseline: mid,
      targetValue: mid,
      minThreshold: item.min,
      maxThreshold: item.max,
      history,
      status: "normal",
      deviationPercent: 0,
      phase: "nominal",
      rateOfChange: 0,
      alarmFired: false,
      isPrimarySource: false,
      inducedBy: null,
      couplingGain: 1.0,
      lagRemainingTicks: 0,
      assetId,
      assetName,
    };
  });
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { triggerAlert } = useNotifications();

  // Master State: signals keyed by assetId
  const [signalsByAsset, setSignalsByAsset] = useState<Record<string, LiveSignalState[]>>(() => {
    const initial: Record<string, LiveSignalState[]> = {};
    for (const a of MILL_ASSETS) {
      initial[a.assetId] = generateDefaultSignals(a.assetId, a.assetName);
    }
    return initial;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Central Physics Engine (runs every 1000ms across all active assets)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setSignalsByAsset((prevMap) => {
        const nextMap: Record<string, LiveSignalState[]> = {};

        for (const [assetId, sigList] of Object.entries(prevMap)) {
          nextMap[assetId] = sigList.map((sig) => {
            const range = sig.maxThreshold - sig.minThreshold || 1;
            const curr = sig.currentValue;
            let nextVal = curr;
            let newPhase = sig.phase;
            let alarmFired = sig.alarmFired;
            let lagRemaining = sig.lagRemainingTicks ?? 0;

            // Transport lag delay for secondary coupled signals
            if (lagRemaining > 0) {
              lagRemaining -= 1;
              const flutter = (Math.random() - 0.5) * range * 0.015;
              nextVal = Number((curr + flutter).toFixed(2));
              return {
                ...sig,
                lagRemainingTicks: lagRemaining,
                currentValue: nextVal,
                history: [...sig.history.slice(1), nextVal],
              };
            }

            if (sig.phase === "nominal") {
              // Harmonic process noise
              const t = Date.now() / 3000;
              const target = sig.baseline + Math.sin(t) * range * 0.04;
              const step = (target - curr) * 0.3 + (Math.random() - 0.5) * range * 0.02;
              nextVal = Number((curr + step).toFixed(2));
            } else if (sig.phase === "ramping") {
              // First-order exponential ramp towards anomaly excursion target
              const dist = sig.targetValue - curr;
              const step = dist * 0.26 + (Math.random() - 0.5) * range * 0.025;
              nextVal = Number((curr + step).toFixed(2));

              if (Math.abs(sig.targetValue - nextVal) <= range * 0.05) {
                newPhase = "excursion";
              }

              // Fire persistent alarm if crossing safety threshold
              const isBreached = nextVal > sig.maxThreshold || nextVal < sig.minThreshold;
              if (isBreached && !alarmFired) {
                alarmFired = true;
                triggerAlert({
                  title: sig.isPrimarySource
                    ? `🚨 ROOT CAUSE ALARM: ${sig.assetName}`
                    : `⚠️ INDUCED CASCADE: ${sig.assetName}`,
                  asset: sig.assetName,
                  signal: sig.signalName,
                  status: "HIGH",
                  value: nextVal,
                  min: sig.minThreshold,
                  max: sig.maxThreshold,
                  unit: sig.unit,
                  percent: Number(
                    (((nextVal - sig.baseline) / (sig.baseline || 1)) * 100).toFixed(1)
                  ),
                  message: sig.isPrimarySource
                    ? `Primary process disturbance on ${sig.signalName}. Operating value breached threshold (${sig.maxThreshold} ${sig.unit}).`
                    : `Induced cascade: ${sig.signalName} deviated in response to upstream disturbance on ${sig.inducedBy}.`,
                });
              }
            } else if (sig.phase === "excursion") {
              // Turbulence at plateau
              const flutter = (Math.random() - 0.5) * range * 0.03;
              nextVal = Number((sig.targetValue + flutter).toFixed(2));
            } else if (sig.phase === "settling") {
              // Closed-loop PID damped settling
              const dist = sig.baseline - curr;
              const step = dist * 0.28 + (Math.random() - 0.5) * range * 0.015;
              nextVal = Number((curr + step).toFixed(2));

              if (Math.abs(nextVal - sig.baseline) <= range * 0.04) {
                newPhase = "nominal";
                alarmFired = false;
                if (sig.isPrimarySource) {
                  triggerAlert({
                    title: `✅ Process Stabilized: ${sig.assetName}`,
                    asset: sig.assetName,
                    signal: sig.signalName,
                    status: "NORMAL",
                    value: nextVal,
                    min: sig.minThreshold,
                    max: sig.maxThreshold,
                    unit: sig.unit,
                    percent: 0,
                    message: `PID loop successfully recovered ${sig.signalName} and normalized all cross-coupled variables.`,
                  });
                }
              }
            }

            const rate = Number((nextVal - curr).toFixed(2));
            const newHistory = [...sig.history.slice(1), nextVal];
            const deviation = Number(
              (((nextVal - sig.baseline) / (sig.baseline || 1)) * 100).toFixed(1)
            );

            let status: "normal" | "warning" | "critical" = "normal";
            if (nextVal > sig.maxThreshold || nextVal < sig.minThreshold) {
              status = "critical";
            } else if (
              nextVal > sig.maxThreshold - range * 0.1 ||
              nextVal < sig.minThreshold + range * 0.1
            ) {
              status = "warning";
            }

            return {
              ...sig,
              currentValue: nextVal,
              history: newHistory,
              status,
              phase: newPhase,
              deviationPercent: deviation,
              rateOfChange: rate,
              alarmFired,
              lagRemainingTicks: 0,
            };
          });
        }

        return nextMap;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [triggerAlert]);

  // Retrieve or lazy-initialize signals for an asset
  const getSignalsForAsset = useCallback((assetId: string, assetName: string): LiveSignalState[] => {
    setSignalsByAsset((prev) => {
      if (prev[assetId]) return prev;
      return {
        ...prev,
        [assetId]: generateDefaultSignals(assetId, assetName),
      };
    });

    return signalsByAsset[assetId] || generateDefaultSignals(assetId, assetName);
  }, [signalsByAsset]);

  // Inject Disturbance / Anomaly from Simulator Page
  const injectDisturbance = useCallback((assetId: string, signalId: string, direction: "high" | "low" = "high") => {
    setSignalsByAsset((prev) => {
      const currentList = prev[assetId] || generateDefaultSignals(assetId, assetId);
      const primarySig = currentList.find((s) => s.signalId === signalId) || currentList[0];
      if (!primarySig) return prev;

      const updated = currentList.map((s, idx) => {
        const range = s.maxThreshold - s.minThreshold || 1;

        if (s.signalId === primarySig.signalId) {
          const target = direction === "high"
            ? Number((s.maxThreshold + range * 0.28).toFixed(2))
            : Number((s.minThreshold - range * 0.25).toFixed(2));

          return {
            ...s,
            phase: "ramping" as ProcessPhase,
            targetValue: target,
            isPrimarySource: true,
            inducedBy: null,
            alarmFired: false,
            lagRemainingTicks: 0,
          };
        } else {
          // Secondary Coupled Cascade
          const lagTicks = idx % 2 === 0 ? 2 : 1;
          const couplingGain = 0.75 + (idx * 0.08);
          const coupledTarget = Number((s.maxThreshold + range * 0.18 * couplingGain).toFixed(2));

          return {
            ...s,
            phase: "ramping" as ProcessPhase,
            targetValue: coupledTarget,
            isPrimarySource: false,
            inducedBy: primarySig.signalName,
            couplingGain,
            alarmFired: false,
            lagRemainingTicks: lagTicks,
          };
        }
      });

      return {
        ...prev,
        [assetId]: updated,
      };
    });
  }, []);

  // Engage PID Control to normalize
  const engagePidControl = useCallback((assetId?: string, signalId?: string) => {
    setSignalsByAsset((prev) => {
      const nextMap: Record<string, LiveSignalState[]> = {};

      for (const [id, sigList] of Object.entries(prev)) {
        if (!assetId || id === assetId) {
          nextMap[id] = sigList.map((s) => {
            if (!signalId || s.signalId === signalId) {
              return {
                ...s,
                phase: "settling" as ProcessPhase,
                targetValue: s.baseline,
                isPrimarySource: false,
                inducedBy: null,
              };
            }
            return s;
          });
        } else {
          nextMap[id] = sigList;
        }
      }

      return nextMap;
    });
  }, []);

  // Manual Value Override Slider
  const setManualValue = useCallback((assetId: string, signalId: string, value: number) => {
    setSignalsByAsset((prev) => {
      const list = prev[assetId];
      if (!list) return prev;

      return {
        ...prev,
        [assetId]: list.map((s) =>
          s.signalId === signalId
            ? { ...s, currentValue: value, targetValue: value, phase: "excursion" as ProcessPhase }
            : s
        ),
      };
    });
  }, []);

  // Pre-configured Mill Scenarios
  const injectPresetScenario = useCallback((scenarioId: string) => {
    if (scenarioId === "vacuum_sag") {
      injectDisturbance("PM-PM1-W01", "sig-PM-PM1-W01-vacuum", "low");
      injectDisturbance("PM-PM1", "sig-PM-PM1-vacuum", "low");
    } else if (scenarioId === "draw_slip") {
      injectDisturbance("PM-PM1-P01", "sig-PM-PM1-P01-draw", "high");
      injectDisturbance("PM-PM1", "sig-PM-PM1-draw", "high");
    } else if (scenarioId === "steam_sag") {
      injectDisturbance("CR-CR3-F01", "sig-CR-CR3-F01-steam-p", "low");
      injectDisturbance("PM-PM1-D01", "sig-PM-PM1-D01-steam-p", "low");
    } else if (scenarioId === "vibration_spike") {
      injectDisturbance("PM-PM1-R01", "sig-PM-PM1-R01-vibration", "high");
    }
  }, [injectDisturbance]);

  const resetAllToNominal = useCallback(() => {
    engagePidControl();
  }, [engagePidControl]);

  // Collect active excursions across plant
  const allSignalsFlat = Object.values(signalsByAsset).flat();
  const activeExcursions = allSignalsFlat.filter((s) => s.status === "critical" || s.phase === "excursion" || s.phase === "ramping");
  const activeDisturbancesCount = activeExcursions.length;

  return (
    <SimulationContext.Provider
      value={{
        signalsByAsset,
        getSignalsForAsset,
        injectDisturbance,
        engagePidControl,
        setManualValue,
        injectPresetScenario,
        resetAllToNominal,
        activeDisturbancesCount,
        activeExcursions,
        allAssets: MILL_ASSETS,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return ctx;
}
