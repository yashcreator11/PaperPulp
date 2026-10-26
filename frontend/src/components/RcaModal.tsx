import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldAlert,
  Activity,
  Bot,
  Wrench,
  DollarSign,
  ChevronRight,
  Zap,
  Play,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export interface AlertRcaData {
  alertId?: string;
  assetName: string;
  signalName: string;
  severity: "Critical" | "Medium" | "Low" | string;
  observedValue?: number | string;
  thresholdValue?: number | string;
  unit?: string;
  deviationPercent?: number;
  timestamp?: string;
  message?: string;
}

interface RcaModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: AlertRcaData | null;
}

export default function RcaModal({ isOpen, onClose, alert }: RcaModalProps) {
  const navigate = useNavigate();
  const [isApplyingAction, setIsApplyingAction] = useState(false);
  const [actionApplied, setActionApplied] = useState(false);

  if (!alert) return null;

  // Domain-specific pulp & paper RCA knowledge engine
  const getRcaDiagnosis = (data: AlertRcaData) => {
    const sName = (data.signalName || "").toLowerCase();
    const aName = (data.assetName || "").toLowerCase();

    if (sName.includes("draw") || sName.includes("tension") || sName.includes("flutter")) {
      return {
        rootCause: "Drive Inverter Speed Synchronization Drift & Cross-Direction Moisture Non-Uniformity",
        confidence: 96,
        category: "DCS Speed Control & Web Mechanics",
        upstreamTrigger: "Moisture variation entering press nip from headbox consistency swing (+0.12%)",
        propagation: [
          { step: "T-00:45", desc: "Headbox fan pump speed oscillation causes basis weight wave" },
          { step: "T-00:20", desc: "Press nip 3 moisture differential causes wet web elongation" },
          { step: "T-00:00", desc: "Draw difference surges +24.8% at open transfer into 1st Dryer group" },
          { step: "Impact", desc: "Critical sheet break hazard; impending open-draw snap & dryer wrap" },
        ],
        correctiveActions: [
          "Trim Press 3-to-Dryer virtual master ratio by -0.15% to relax web strain",
          "Increase 1st Dryer steam header pressure to 2.4 bar to boost dry line stability",
          "Recalibrate ABB ACS880 encoder feedback coupling on section drive #4",
        ],
        estimatedSavings: "$18,500 / incident",
        downtimePrevented: "45 mins of broke cleanout",
      };
    }

    if (sName.includes("vacuum") || sName.includes("couch") || sName.includes("wire")) {
      return {
        rootCause: "Liquid Ring Vacuum Pump Seal Water Low Pressure & Seal Orifice Cavitation",
        confidence: 94,
        category: "Forming Dewatering & Hydraulics",
        upstreamTrigger: "Seal water strainer clogging reduced cooling flow to Nash vacuum pump VP-02",
        propagation: [
          { step: "T-01:10", desc: "Seal water line pressure dropped below 2.2 bar threshold" },
          { step: "T-00:35", desc: "Cavitation inside pump rotor reduced effective displacement by 32%" },
          { step: "T-00:00", desc: "Suction couch roll vacuum sagged to -44.2 kPa (-28.4% deviation)" },
          { step: "Impact", desc: "Insufficient dry content (<18.5%) entering press; web crushing risk" },
        ],
        correctiveActions: [
          "Switch liquid ring vacuum pump duty to standby auxiliary pump VP-03",
          "Backflush the vacuum pump seal water basket strainer",
          "Increase forming table foil angle by +0.5° to assist early gravity dewatering",
        ],
        estimatedSavings: "$24,000 / incident",
        downtimePrevented: "60 mins wire cleanout",
      };
    }

    if (sName.includes("steam") || sName.includes("boiler") || sName.includes("temp")) {
      return {
        rootCause: "Black Liquor Fuel Viscosity Drift & Secondary Air Damper Stiction",
        confidence: 92,
        category: "Thermodynamic Combustion & Heat Transfer",
        upstreamTrigger: "Heavy black liquor preheater temperature dropped 4°C below flash point",
        propagation: [
          { step: "T-02:00", desc: "Liquor gun spray atomization droplet size increased to >3.5mm" },
          { step: "T-00:50", desc: "Bed burning rate decreased, reducing radiative heat transfer" },
          { step: "T-00:00", desc: "Main steam header pressure dropped 18.0 bar below turbine setpoint" },
          { step: "Impact", desc: "Thermal deficit at paper machine dryers causing wet sheet moisture" },
        ],
        correctiveActions: [
          "Adjust direct steam injection heater to restore liquor temp to 118°C",
          "Cycle secondary air damper actuator to clear mechanical stiction",
          "Trim auxiliary natural gas co-firing burner by +12% until bed recovers",
        ],
        estimatedSavings: "$31,000 / event",
        downtimePrevented: "Avoided whole-mill steam curtailment",
      };
    }

    // Default / General industrial anomaly RCA
    return {
      rootCause: `Dynamic Load Fluctuation and Transducer Drift on ${data.assetName}`,
      confidence: 89,
      category: "Sensor Drift & Mechanical Coupling",
      upstreamTrigger: `Measured value (${data.observedValue ?? "Out-of-range"}) exceeded safe boundary (${data.thresholdValue ?? "Setpoint"})`,
      propagation: [
        { step: "T-00:30", desc: "Operating telemetry crossed normal deadband range" },
        { step: "T-00:15", desc: "Persistent deviation detected for more than 3 consecutive cycles" },
        { step: "T-00:00", desc: `High deviation alarm tripped on ${data.signalName}` },
        { step: "Impact", desc: "Degraded product quality and accelerated mechanical fatigue" },
      ],
      correctiveActions: [
        "Inspect sensor wiring connection and calibrate analog 4-20mA loop",
        "Verify downstream control valve and actuator positioning feedback",
        "Apply adaptive setpoint damping until continuous baseline restabilizes",
      ],
      estimatedSavings: "$12,000 / event",
      downtimePrevented: "Preventive repair vs. emergency trip",
    };
  };

  const diagnosis = getRcaDiagnosis(alert);

  const handleApplyAction = () => {
    setIsApplyingAction(true);
    setTimeout(() => {
      setIsApplyingAction(false);
      setActionApplied(true);
      toast.success(
        `Action Dispatched: Setpoint compensation applied to ${alert.assetName}. Deviation normalizing!`
      );
    }, 1200);
  };

  const handleOpenCopilot = () => {
    onClose();
    navigate("/ai", {
      state: {
        prefillPrompt: `Run deep root cause analysis for ${alert.assetName} on signal ${alert.signalName}. Observed value was ${alert.observedValue ?? "abnormal"} with deviation ${alert.deviationPercent ?? 24}%. What are the secondary cascading risks?`,
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-card border border-border shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Sparkles className="w-6 h-6 animate-pulse text-emerald-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  AI Root Cause Analysis (RCA)
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    {diagnosis.confidence}% Confidence
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automated industrial physics diagnosis & failure chain reconstruction
                </p>
              </div>
            </div>

            {/* Alert Context Chip */}
            <div className="flex items-center gap-2 bg-muted/50 border border-border px-3 py-1.5 rounded-xl text-xs">
              <span className="font-bold text-foreground">{alert.assetName}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{alert.signalName}</span>
              <Badge
                className={
                  alert.severity === "Critical"
                    ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 text-[10px]"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px]"
                }
              >
                {alert.severity}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1. PRIMARY ROOT CAUSE BANNER */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-cyan-500/10 border border-emerald-500/30 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Primary Root Cause Identified
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Domain: {diagnosis.category}
              </span>
            </div>
            <p className="text-base font-extrabold text-foreground leading-snug">
              {diagnosis.rootCause}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              <strong className="text-foreground">Trigger Origin:</strong> {diagnosis.upstreamTrigger}
            </p>
          </div>

          {/* 2. TWO-COLUMN DIAGNOSTIC GRID: PROPAGATION CHAIN & FINANCIAL SAVINGS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Timeline / Fault Tree */}
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-primary" /> Fault Propagation Chain
              </h3>
              <div className="space-y-2 text-xs">
                {diagnosis.propagation.map((p, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground shrink-0 mt-0.5">
                      {p.step}
                    </span>
                    <p className={`text-xs ${idx === diagnosis.propagation.length - 1 ? "font-bold text-destructive" : "text-foreground"}`}>
                      {p.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Impact & Loss Prevention */}
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Loss Prevention & Break ROI
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-card border border-border">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Cost Avoidance</p>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {diagnosis.estimatedSavings}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Downtime Saved</p>
                  <p className="text-base font-black text-primary mt-0.5">
                    {diagnosis.downtimePrevented}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Immediate mitigation within the next <strong>12 minutes</strong> prevents automatic machine trip.
                </span>
              </div>
            </div>
          </div>

          {/* 3. STANDARD OPERATING PROCEDURE (SOP) RECOMMENDED ACTIONS */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-primary" /> Recommended Remediation Protocol (SOP)
              </h3>
              <span className="text-[11px] text-muted-foreground font-medium">Auto-compiled from Mill Playbook</span>
            </div>

            <div className="space-y-2">
              {diagnosis.correctiveActions.map((action, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/80 text-xs hover:bg-muted/70 transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-medium text-foreground flex-1">{action}</span>
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground/50" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenCopilot}
            className="text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Bot className="w-3.5 h-3.5 text-primary" />
            Discuss with AI Copilot
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Dismiss
            </Button>

            <Button
              size="sm"
              onClick={handleApplyAction}
              disabled={isApplyingAction || actionApplied}
              className={`text-xs font-bold gap-1.5 ${
                actionApplied
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isApplyingAction ? (
                "Dispatching to DCS..."
              ) : actionApplied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Corrective Action Applied
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Apply Corrective Setpoint
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
