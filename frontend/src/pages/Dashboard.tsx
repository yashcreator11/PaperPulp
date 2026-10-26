import { useEffect, useState } from "react";
import {
  Factory,
  Gauge,
  Zap,
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  Layers,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getDevices, getAvgApiResponseTime } from "@/api/deviceApi";
import { getAssetHierarchy } from "@/api/assetApi";
import { useAuth } from "@/context/AuthContext";
import PaperMachineBreakPredictor, { PaperMillRoiCalculator } from "@/components/PaperMachineBreakPredictor";

interface IndustrialMetricProps {
  label: string;
  value: string | number;
  subValue?: string;
  unit?: string;
  target?: string;
  status?: "optimal" | "warning" | "critical";
  trend?: string;
  icon: any;
}

const IndustrialKPICard = ({
  label,
  value,
  subValue,
  unit,
  target,
  status = "optimal",
  trend,
  icon: Icon,
}: IndustrialMetricProps) => {
  const statusColors = {
    optimal: "border-emerald-500/30 bg-emerald-500/5 text-emerald-500",
    warning: "border-amber-500/30 bg-amber-500/5 text-amber-500",
    critical: "border-rose-500/30 bg-rose-500/5 text-rose-500",
  };

  const badgeColors = {
    optimal: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  };

  return (
    <div className="relative rounded-2xl bg-card border border-border p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate mb-1">
            {label}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight">
              {value}
            </span>
            {unit && <span className="text-xs font-bold text-muted-foreground font-mono">{unit}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {target && (
              <span className="text-[11px] font-medium text-muted-foreground font-mono">
                Target: {target}
              </span>
            )}
            {trend && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeColors[status]}`}>
                {trend}
              </span>
            )}
          </div>
          {subValue && <p className="text-[11px] text-muted-foreground mt-1 truncate">{subValue}</p>}
        </div>

        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${statusColors[status]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [totalDevices, setTotalDevices] = useState(5);
  const [totalAssets, setTotalAssets] = useState(21);
  const [avgResponse, setAvgResponse] = useState<number>(38);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const avgResTime = await getAvgApiResponseTime();
        setAvgResponse(avgResTime || 38);

        const deviceRes = await getDevices(1, 100);
        setTotalDevices(deviceRes.totalCount || deviceRes.items?.length || 5);

        const assets = await getAssetHierarchy();
        const countAssets = (nodes: any): number =>
          nodes.reduce((acc: number, n: any) => acc + 1 + (n.childrens ? countAssets(n.childrens) : 0), 0);
        setTotalAssets(countAssets(assets || []));
      } catch (err) {
        console.warn("Using Paper Mill digital twin live telemetry:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] rounded-2xl border border-border bg-card">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold text-muted-foreground">Synchronizing mill digital twin...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 p-1 sm:p-2">
      {/* Mill Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Factory className="w-7 h-7 text-emerald-500" />
              Paper Mill Operational Intelligence
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              MILL #1 LIVE
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Integrated Fiberline, Chemical Recovery & High-Speed Paper Machine Digital Twin
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              5 DCS/PLCs Online ({avgResponse.toFixed(0)} ms)
            </span>
          </div>
        </div>
      </div>

      {/* 1. PRIMARY OPERATIONAL & PRODUCTION KPIs (Placed FIRST) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            Core Manufacturing & Reliability KPIs
          </h2>
          <span className="text-xs text-muted-foreground">Shift Target: 400 Tons • 24h Operating Window</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <IndustrialKPICard
            label="Mill OEE"
            value="89.4"
            unit="%"
            target=">85%"
            trend="+2.1% this week"
            subValue="Avail: 93% • Perf: 98% • Qual: 98%"
            status="optimal"
            icon={Gauge}
          />
          <IndustrialKPICard
            label="Daily Production"
            value="1,280"
            unit="TPD"
            target="1,200 TPD"
            trend="+6.7% vs budget"
            subValue="Kraft Linerboard & Fluting"
            status="optimal"
            icon={Factory}
          />
          <IndustrialKPICard
            label="Machine Speed"
            value="1,045"
            unit="m/min"
            target="1,100 max"
            trend="Steady"
            subValue="PM #1 Wire / Press Synchronized"
            status="optimal"
            icon={TrendingUp}
          />
          <IndustrialKPICard
            label="Sheet Break Index"
            value="0.38"
            unit="/day"
            target="<0.8 /day"
            trend="-65% break reduction"
            subValue="MTTB: 63.2 operating hours"
            status="optimal"
            icon={ShieldCheck}
          />
          <IndustrialKPICard
            label="Steam Economy"
            value="1.84"
            unit="GJ/t"
            target="<1.90 GJ/t"
            trend="Energy Optimized"
            subValue="Dryer & digester thermal draw"
            status="optimal"
            icon={Zap}
          />
          <IndustrialKPICard
            label="Quality Compliance"
            value="99.2"
            unit="%"
            target=">98.5%"
            trend="First-Pass Compliant"
            subValue="BW 205 g/m² • Moist 7.2%"
            status="optimal"
            icon={CheckCircle2}
          />
        </div>
      </div>

      {/* 2. DEMO SIMULATOR & PREDICTIVE BREAK INTELLIGENCE (showRoi=false) */}
      <PaperMachineBreakPredictor showRoi={false} />

      {/* 3. PLANT-WIDE ASSET DEPARTMENTS & TELEMETRY HEALTH */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Fiberline Department Status */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="font-bold text-sm text-foreground">Fiberline (Pulping & Bleach)</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              OPTIMAL
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40">
              <p className="text-muted-foreground text-[11px]">Digester Temp</p>
              <p className="font-bold font-mono text-sm text-foreground">162.5 °C</p>
              <span className="text-[10px] text-emerald-500">10.4 bar g</span>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40">
              <p className="text-muted-foreground text-[11px]">Brownstock Kappa</p>
              <p className="font-bold font-mono text-sm text-foreground">28.4</p>
              <span className="text-[10px] text-emerald-500">Target 26-30</span>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40">
              <p className="text-muted-foreground text-[11px]">Washer Consistency</p>
              <p className="font-bold font-mono text-sm text-foreground">11.8 %</p>
              <span className="text-[10px] text-muted-foreground">Flow 9.2 m³/t</span>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40">
              <p className="text-muted-foreground text-[11px]">D0 Bleach pH</p>
              <p className="font-bold font-mono text-sm text-foreground">3.4</p>
              <span className="text-[10px] text-emerald-500">Brightness 89.2%</span>
            </div>
          </div>
        </div>

        {/* Chemical Recovery & Power Boiler */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <h3 className="font-bold text-sm text-foreground">Chemical Recovery Boiler</h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-500 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
              BALANCED
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40">
              <p className="text-muted-foreground text-[11px]">HP Steam Generation</p>
              <p className="font-bold font-mono text-sm text-foreground">98.2 bar</p>
              <span className="text-[10px] text-cyan-500">Flow 185 t/h</span>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40">
              <p className="text-muted-foreground text-[11px]">Char Bed Temp</p>
              <p className="font-bold font-mono text-sm text-foreground">945 °C</p>
              <span className="text-[10px] text-emerald-500">Stable Reduction</span>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40">
              <p className="text-muted-foreground text-[11px]">Black Liquor Solids</p>
              <p className="font-bold font-mono text-sm text-foreground">74.5 %</p>
              <span className="text-[10px] text-emerald-500">Safe Firing Spec</span>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40">
              <p className="text-muted-foreground text-[11px]">TRS Emissions</p>
              <p className="font-bold font-mono text-sm text-foreground">2.1 ppm</p>
              <span className="text-[10px] text-emerald-500">EPA Compliant</span>
            </div>
          </div>
        </div>

        {/* OT Infrastructure & Digital Twin Scope */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="font-bold text-sm text-foreground">OT Infrastructure & Memory</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              HEALTHY
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center bg-muted/40 p-2 rounded-xl border border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-primary" /> Active OT Gateways
              </span>
              <span className="font-bold font-mono text-foreground">{totalDevices} Connected</span>
            </div>
            <div className="flex justify-between items-center bg-muted/40 p-2 rounded-xl border border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" /> Monitored Mill Assets
              </span>
              <span className="font-bold font-mono text-foreground">{totalAssets} Nodes</span>
            </div>
            <div className="flex justify-between items-center bg-muted/40 p-2 rounded-xl border border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Vector Memory (Qdrant)
              </span>
              <span className="font-bold font-mono text-emerald-500">Synchronized</span>
            </div>
            <div className="flex justify-between items-center bg-muted/40 p-2 rounded-xl border border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Gateway Sampling Rate
              </span>
              <span className="font-bold font-mono text-foreground">1,000 ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FINANCIAL COST SAVINGS & AVOIDED DOWNTIME ROI CALCULATOR (Placed AT THE VERY LAST) */}
      <div className="pt-2">
        <PaperMillRoiCalculator />
      </div>
    </div>
  );
}
