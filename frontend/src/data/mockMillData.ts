import type { Asset, IMapping } from "@/api/assetApi";
import type { Device } from "@/api/deviceApi";

/* =====================================================================
   MOCK INDUSTRIAL DEVICES (5 Industrial Controllers)
===================================================================== */
export const MOCK_DEVICES: any[] = [
  {
    deviceId: "dev-fiberline",
    name: "PLC-FIBERLINE",
    description: "Rockwell ControlLogix 5580 — Continuous Digester, Blow Line & O2 Delignification",
    protocol: "Modbus",
    isDeleted: false,
    createdAt: new Date().toISOString(),
    configuration: {
      configurationId: "cfg-1",
      name: "Fiberline Modbus TCP Gateway",
      protocol: 1,
      pollIntervalMs: 1000,
      ipAddress: "192.168.10.21",
      port: 502,
      slaveId: 1,
      endian: "Big",
    },
    ports: [
      { slaveIndex: 1, registerAddress: 40001, dataType: "Float32", unit: "°C", isHealthy: true, protocol: 1 },
      { slaveIndex: 1, registerAddress: 40003, dataType: "Float32", unit: "bar g", isHealthy: true, protocol: 1 },
      { slaveIndex: 1, registerAddress: 40005, dataType: "Float32", unit: "g/L", isHealthy: true, protocol: 1 },
      { slaveIndex: 1, registerAddress: 40007, dataType: "Float32", unit: "mm/s", isHealthy: true, protocol: 1 },
    ],
  },
  {
    deviceId: "dev-bleach",
    name: "PLC-BLEACH",
    description: "Siemens S7-1500 — D0 Mixer, ClO2 Dosing Control & Bleached Pulp Washing",
    protocol: "Modbus",
    isDeleted: false,
    createdAt: new Date().toISOString(),
    configuration: {
      configurationId: "cfg-2",
      name: "Bleach Plant PLC Gateway",
      protocol: 1,
      pollIntervalMs: 1000,
      ipAddress: "192.168.10.22",
      port: 502,
      slaveId: 2,
      endian: "Big",
    },
    ports: [
      { slaveIndex: 2, registerAddress: 40011, dataType: "Float32", unit: "kg/odt", isHealthy: true, protocol: 1 },
      { slaveIndex: 2, registerAddress: 40013, dataType: "Float32", unit: "pH", isHealthy: true, protocol: 1 },
      { slaveIndex: 2, registerAddress: 40015, dataType: "Float32", unit: "% ISO", isHealthy: true, protocol: 1 },
    ],
  },
  {
    deviceId: "dev-recovery",
    name: "DCS-RECOVERY",
    description: "Valmet DNA / ABB 800xA — Black Liquor Evaporators, Recovery Boiler & Causticizing",
    protocol: "OpcUa",
    isDeleted: false,
    createdAt: new Date().toISOString(),
    configuration: {
      configurationId: "cfg-3",
      name: "Chemical Recovery DCS Node",
      protocol: 2,
      pollIntervalMs: 2000,
      connectionString: "opc.tcp://192.168.20.10:4840/RecoveryDCS",
      connectionMode: 1,
    },
  },
  {
    deviceId: "dev-pm-qcs",
    name: "PM-QCS",
    description: "Honeywell Experion / Voith QCS Scanner — Headbox, Press Section, Dryers & Calender",
    protocol: "OpcUa",
    isDeleted: false,
    createdAt: new Date().toISOString(),
    configuration: {
      configurationId: "cfg-4",
      name: "Paper Machine Scanner & Drive DCS",
      protocol: 2,
      pollIntervalMs: 500,
      connectionString: "opc.tcp://192.168.30.50:4840/PaperMachineQCS",
      connectionMode: 1,
    },
  },
  {
    deviceId: "dev-lims",
    name: "LAB-LIMS",
    description: "LIMS Automated Quality Lab — Brownstock Kappa, Fiber Length & Sheet Tensile Tests",
    protocol: "Modbus",
    isDeleted: false,
    createdAt: new Date().toISOString(),
    configuration: {
      configurationId: "cfg-5",
      name: "Laboratory Analyzer Gateway",
      protocol: 1,
      pollIntervalMs: 5000,
      ipAddress: "192.168.10.25",
      port: 502,
      slaveId: 5,
      endian: "Little",
    },
    ports: [
      { slaveIndex: 5, registerAddress: 40031, dataType: "Float32", unit: "kappa", isHealthy: true, protocol: 1 },
      { slaveIndex: 5, registerAddress: 40033, dataType: "Float32", unit: "kN/m", isHealthy: true, protocol: 1 },
    ],
  },
];

/* =====================================================================
   MOCK ASSET HIERARCHY (Plant -> Department -> Line -> Machine -> SubMachine)
===================================================================== */
export const MOCK_ASSET_HIERARCHY: Asset[] = [
  {
    assetId: "ast-plant-1",
    name: "PaperPulp Integrated Mill #1",
    level: 1,
    isDeleted: false,
    childrens: [
      {
        assetId: "ast-dept-1",
        name: "Fiberline Department",
        level: 2,
        isDeleted: false,
        childrens: [
          {
            assetId: "ast-line-1",
            name: "Kraft Pulping & Bleaching Line A",
            level: 3,
            isDeleted: false,
            childrens: [
              {
                assetId: "ast-mac-dig",
                name: "Continuous Digester (FL-DIG-V01)",
                level: 4,
                isDeleted: false,
                childrens: [],
              },
              {
                assetId: "ast-mac-bsw",
                name: "Brownstock Drum Washer (FL-BSW-W01)",
                level: 4,
                isDeleted: false,
                childrens: [],
              },
              {
                assetId: "ast-mac-o2",
                name: "Oxygen Delignification Reactor (FL-O2-R01)",
                level: 4,
                isDeleted: false,
                childrens: [],
              },
              {
                assetId: "ast-mac-blc",
                name: "Bleach D0 Tower & Mixer (FL-BLC-T01)",
                level: 4,
                isDeleted: false,
                childrens: [],
              },
            ],
          },
        ],
      },
      {
        assetId: "ast-dept-2",
        name: "Chemical Recovery & Utilities",
        level: 2,
        isDeleted: false,
        childrens: [
          {
            assetId: "ast-line-2",
            name: "Black Liquor & Smelt Recovery Loop",
            level: 3,
            isDeleted: false,
            childrens: [
              {
                assetId: "ast-mac-evap",
                name: "Multiple-Effect Evaporator (CR-CR2-C01)",
                level: 4,
                isDeleted: false,
                childrens: [],
              },
              {
                assetId: "ast-mac-recb",
                name: "Kraft Recovery Boiler (CR-CR3-F01)",
                level: 4,
                isDeleted: false,
                childrens: [],
              },
              {
                assetId: "ast-mac-caust",
                name: "Causticizing Slaker & Lime Kiln (CR-CR5-C01)",
                level: 4,
                isDeleted: false,
                childrens: [],
              },
            ],
          },
        ],
      },
      {
        assetId: "ast-dept-3",
        name: "Paper Machine Mill",
        level: 2,
        isDeleted: false,
        childrens: [
          {
            assetId: "ast-line-3",
            name: "High-Speed Paper Machine Line #1",
            level: 3,
            isDeleted: false,
            childrens: [
              {
                assetId: "ast-mac-pm1",
                name: "Paper Machine #1 Train (Step 15)",
                level: 4,
                isDeleted: false,
                childrens: [
                  {
                    assetId: "ast-sub-hb",
                    name: "Headbox Section (PM-PM1-H01)",
                    level: 5,
                    isDeleted: false,
                    childrens: [],
                  },
                  {
                    assetId: "ast-sub-wire",
                    name: "Fourdrinier Wire Table (PM-PM1-W01)",
                    level: 5,
                    isDeleted: false,
                    childrens: [],
                  },
                  {
                    assetId: "ast-sub-press",
                    name: "3-Nip Press Section (PM-PM1-P01)",
                    level: 5,
                    isDeleted: false,
                    childrens: [],
                  },
                  {
                    assetId: "ast-sub-dryer",
                    name: "Dryer Cylinder Section (PM-PM1-D01)",
                    level: 5,
                    isDeleted: false,
                    childrens: [],
                  },
                  {
                    assetId: "ast-sub-reel",
                    name: "Pope Reel & QCS Scanner (PM-PM1-R01)",
                    level: 5,
                    isDeleted: false,
                    childrens: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

/* =====================================================================
   MOCK SIGNAL MAPPINGS PER ASSET (Signals, Units, Min/Max Limits)
===================================================================== */
export const MOCK_MAPPINGS: Record<string, IMapping[]> = {
  // Continuous Digester
  "ast-mac-dig": [
    {
      signalId: "sig-cook-temp",
      signalKey: "FL-DIG-V01.CookTemp",
      signalName: "Cooking Zone Temperature",
      unit: "°C",
      assetId: "ast-mac-dig",
      deviceId: "dev-fiberline",
      minThreshold: 140,
      maxThreshold: 175,
      createdAt: new Date().toISOString(),
      registerId: "reg-101",
      opcUaNodeId: null,
    },
    {
      signalId: "sig-dig-press",
      signalKey: "FL-DIG-V01.Pressure",
      signalName: "Digester Operating Pressure",
      unit: "bar g",
      assetId: "ast-mac-dig",
      deviceId: "dev-fiberline",
      minThreshold: 9.0,
      maxThreshold: 11.7,
      createdAt: new Date().toISOString(),
      registerId: "reg-102",
      opcUaNodeId: null,
    },
    {
      signalId: "sig-resid-ea",
      signalKey: "FL-DIG-V01.ResidEA",
      signalName: "Residual Effective Alkali",
      unit: "g/L as Na₂O",
      assetId: "ast-mac-dig",
      deviceId: "dev-fiberline",
      minThreshold: 2.0,
      maxThreshold: 4.0,
      createdAt: new Date().toISOString(),
      registerId: "reg-103",
      opcUaNodeId: null,
    },
    {
      signalId: "sig-pump-vib",
      signalKey: "FL-DIG-P01.Vibration",
      signalName: "Circulation Pump Vibration",
      unit: "mm/s",
      assetId: "ast-mac-dig",
      deviceId: "dev-fiberline",
      minThreshold: 0.1,
      maxThreshold: 2.8,
      createdAt: new Date().toISOString(),
      registerId: "reg-104",
      opcUaNodeId: null,
    },
  ],

  // Brownstock Washer
  "ast-mac-bsw": [
    {
      signalId: "sig-bsw-cons",
      signalKey: "FL-BSW-W01.DischCons",
      signalName: "Discharge Mat Pulp Consistency",
      unit: "%",
      assetId: "ast-mac-bsw",
      deviceId: "dev-fiberline",
      minThreshold: 10.0,
      maxThreshold: 13.0,
      createdAt: new Date().toISOString(),
      registerId: "reg-105",
      opcUaNodeId: null,
    },
    {
      signalId: "sig-bsw-flow",
      signalKey: "FL-BSW-P01.WashFlow",
      signalName: "Wash Water Flow per Washer",
      unit: "m³/t",
      assetId: "ast-mac-bsw",
      deviceId: "dev-fiberline",
      minThreshold: 8.0,
      maxThreshold: 10.0,
      createdAt: new Date().toISOString(),
      registerId: "reg-106",
      opcUaNodeId: null,
    },
  ],

  // Oxygen Delignification
  "ast-mac-o2": [
    {
      signalId: "sig-o2-temp",
      signalKey: "FL-O2-R01.Temp",
      signalName: "Oxygen Reactor Temperature",
      unit: "°C",
      assetId: "ast-mac-o2",
      deviceId: "dev-fiberline",
      minThreshold: 80,
      maxThreshold: 110,
      createdAt: new Date().toISOString(),
      registerId: "reg-107",
      opcUaNodeId: null,
    },
    {
      signalId: "sig-o2-kappa",
      signalKey: "LAB-QC-A01.Kappa",
      signalName: "Delignified Pulp Kappa Number",
      unit: "kappa",
      assetId: "ast-mac-o2",
      deviceId: "dev-lims",
      minThreshold: 25,
      maxThreshold: 35,
      createdAt: new Date().toISOString(),
      registerId: "reg-108",
      opcUaNodeId: null,
    },
  ],

  // Bleach Plant
  "ast-mac-blc": [
    {
      signalId: "sig-blc-dose",
      signalKey: "FL-BLC-M01.ClO2Dose",
      signalName: "D0 ClO₂ Dosing Flow",
      unit: "kg/odt",
      assetId: "ast-mac-blc",
      deviceId: "dev-bleach",
      minThreshold: 4.6,
      maxThreshold: 13.3,
      createdAt: new Date().toISOString(),
      registerId: "reg-109",
      opcUaNodeId: null,
    },
    {
      signalId: "sig-blc-ph",
      signalKey: "FL-BLC-T01.EndPH",
      signalName: "D0 Tower End pH",
      unit: "pH",
      assetId: "ast-mac-blc",
      deviceId: "dev-bleach",
      minThreshold: 2.0,
      maxThreshold: 4.5,
      createdAt: new Date().toISOString(),
      registerId: "reg-110",
      opcUaNodeId: null,
    },
    {
      signalId: "sig-blc-bright",
      signalKey: "FL-BLC-T02.Brightness",
      signalName: "Final Bleached Pulp Brightness",
      unit: "% ISO",
      assetId: "ast-mac-blc",
      deviceId: "dev-bleach",
      minThreshold: 85.0,
      maxThreshold: 91.0,
      createdAt: new Date().toISOString(),
      registerId: "reg-111",
      opcUaNodeId: null,
    },
  ],

  // Recovery Boiler
  "ast-mac-recb": [
    {
      signalId: "sig-rec-steam",
      signalKey: "CR-CR3-F01.SteamPress",
      signalName: "Recovery Boiler High-Pressure Steam",
      unit: "bar",
      assetId: "ast-mac-recb",
      deviceId: "dev-recovery",
      minThreshold: 80.0,
      maxThreshold: 110.0,
      createdAt: new Date().toISOString(),
      registerId: null,
      opcUaNodeId: "ns=2;s=RecoveryBoiler.SteamPressure",
    },
    {
      signalId: "sig-rec-charbed",
      signalKey: "CR-CR3-F01.CharBedTemp",
      signalName: "Recovery Furnace Char Bed Temperature",
      unit: "°C",
      assetId: "ast-mac-recb",
      deviceId: "dev-recovery",
      minThreshold: 900,
      maxThreshold: 1200,
      createdAt: new Date().toISOString(),
      registerId: null,
      opcUaNodeId: "ns=2;s=RecoveryBoiler.CharBedTemp",
    },
  ],

  // Headbox
  "ast-sub-hb": [
    {
      signalId: "sig-hb-head",
      signalKey: "HB_TOTAL_HEAD",
      signalName: "Headbox Total Pressure Head",
      unit: "kPa",
      assetId: "ast-sub-hb",
      deviceId: "dev-pm-qcs",
      minThreshold: 30.0,
      maxThreshold: 95.0,
      createdAt: new Date().toISOString(),
      registerId: null,
      opcUaNodeId: "ns=2;s=PaperMachine.Headbox.TotalHead",
    },
    {
      signalId: "sig-hb-cons",
      signalKey: "HB_STOCK_CONS",
      signalName: "Stock Slurry Consistency",
      unit: "%",
      assetId: "ast-sub-hb",
      deviceId: "dev-pm-qcs",
      minThreshold: 0.40,
      maxThreshold: 0.95,
      createdAt: new Date().toISOString(),
      registerId: null,
      opcUaNodeId: "ns=2;s=PaperMachine.Headbox.Consistency",
    },
  ],

  // Forming Wire Table
  "ast-sub-wire": [
    {
      signalId: "sig-wire-vac",
      signalKey: "COUCH_VACUUM",
      signalName: "Suction Couch Roll Vacuum",
      unit: "kPa",
      assetId: "ast-sub-wire",
      deviceId: "dev-pm-qcs",
      minThreshold: -85.0,
      maxThreshold: -40.0,
      createdAt: new Date().toISOString(),
      registerId: null,
      opcUaNodeId: "ns=2;s=PaperMachine.Wire.CouchVacuum",
    },
    {
      signalId: "sig-wire-speed",
      signalKey: "WIRE_SPEED",
      signalName: "Forming Wire Operating Speed",
      unit: "m/min",
      assetId: "ast-sub-wire",
      deviceId: "dev-pm-qcs",
      minThreshold: 950,
      maxThreshold: 1250,
      createdAt: new Date().toISOString(),
      registerId: null,
      opcUaNodeId: "ns=2;s=PaperMachine.Wire.Speed",
    },
  ],

  // Press Section
  "ast-sub-press": [
    {
      signalId: "sig-press-draw",
      signalKey: "PRESS_DRAW_DIFF",
      signalName: "Press 3-to-Dryer Draw Differential",
      unit: "%",
      assetId: "ast-sub-press",
      deviceId: "dev-pm-qcs",
      minThreshold: 0.8,
      maxThreshold: 3.2,
      createdAt: new Date().toISOString(),
      registerId: null,
      opcUaNodeId: "ns=2;s=PaperMachine.Press.DrawDiff",
    },
    {
      signalId: "sig-press-nip",
      signalKey: "NIP_PRESSURE_P1",
      signalName: "1st Press Nip Linear Load",
      unit: "kN/m",
      assetId: "ast-sub-press",
      deviceId: "dev-pm-qcs",
      minThreshold: 500,
      maxThreshold: 1200,
      createdAt: new Date().toISOString(),
      registerId: null,
      opcUaNodeId: "ns=2;s=PaperMachine.Press.NipPressure",
    },
  ],

  // Dryer Section
  "ast-sub-dryer": [
    {
      signalId: "sig-dryer-steam",
      signalKey: "DRYER_STEAM_PRESS",
      signalName: "Dryer Section Main Steam Pressure",
      unit: "bar",
      assetId: "ast-sub-dryer",
      deviceId: "dev-pm-qcs",
      minThreshold: 0.8,
      maxThreshold: 9.0,
      createdAt: new Date().toISOString(),
      registerId: null,
      opcUaNodeId: "ns=2;s=PaperMachine.Dryer.SteamPressure",
    },
  ],

  // Reel & QCS Scanner
  "ast-sub-reel": [
    {
      signalId: "sig-qcs-bw",
      signalKey: "QCS_BASIS_WEIGHT",
      signalName: "Scanner Finished Basis Weight",
      unit: "g/m²",
      assetId: "ast-sub-reel",
      deviceId: "dev-pm-qcs",
      minThreshold: 195.0,
      maxThreshold: 215.0,
      createdAt: new Date().toISOString(),
      registerId: null,
      opcUaNodeId: "ns=2;s=PaperMachine.QCS.BasisWeight",
    },
    {
      signalId: "sig-qcs-moist",
      signalKey: "QCS_MOISTURE",
      signalName: "Finished Paper Sheet Moisture",
      unit: "%",
      assetId: "ast-sub-reel",
      deviceId: "dev-pm-qcs",
      minThreshold: 4.5,
      maxThreshold: 10.5,
      createdAt: new Date().toISOString(),
      registerId: null,
      opcUaNodeId: "ns=2;s=PaperMachine.QCS.Moisture",
    },
    {
      signalId: "sig-reel-tension",
      signalKey: "WEB_TENSION_REEL",
      signalName: "Sheet Tension at Pope Reel",
      unit: "kN/m",
      assetId: "ast-sub-reel",
      deviceId: "dev-pm-qcs",
      minThreshold: 0.6,
      maxThreshold: 3.5,
      createdAt: new Date().toISOString(),
      registerId: null,
      opcUaNodeId: "ns=2;s=PaperMachine.Reel.Tension",
    },
  ],
};

function hashSignalName(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/* Helper to generate realistic telemetry points */
export function generateMockTelemetry(signalName: string, unit: string = "", count: number = 30) {
  const now = Date.now();
  const stepMs = 60 * 1000; // 1 minute steps
  const sLower = (signalName || "").toLowerCase();
  const seed = hashSignalName(signalName || "default");

  // Per-signal unique frequency and phase shift
  const phase1 = ((seed % 360) * Math.PI) / 180;
  const phase2 = (((seed >> 3) % 360) * Math.PI) / 180;
  const freq1 = 2.5 + (seed % 4);
  const freq2 = 5.0 + ((seed >> 2) % 5);
  const uniqueOffset = ((seed % 100) / 100 - 0.5); // -0.5 to +0.5 multiplier

  let baseVal = 50.0 + (seed % 30);
  let jitter = 1.5;

  if (sLower.includes("speed") || sLower.includes("wire") || sLower.includes("rpm")) {
    baseVal = 980 + (seed % 120); // 980 - 1100 m/min
    jitter = 8.5;
  } else if (sLower.includes("temp") || sLower.includes("cook")) {
    baseVal = 158 + (seed % 15); // 158 - 173 °C
    jitter = 2.2;
  } else if (sLower.includes("steam") || sLower.includes("press") || sLower.includes("nip")) {
    if (sLower.includes("nip")) {
      baseVal = 120 + (seed % 30); // 120 - 150 kN/m
      jitter = 3.0;
    } else {
      baseVal = 4.2 + ((seed % 40) / 10); // 4.2 - 8.2 bar
      jitter = 0.35;
    }
  } else if (sLower.includes("vac") || sLower.includes("couch") || sLower.includes("suction")) {
    baseVal = -(55 + (seed % 20)); // -55 to -75 kPa
    jitter = 2.4;
  } else if (sLower.includes("consist")) {
    baseVal = sLower.includes("hb") || sLower.includes("head") ? 0.72 + ((seed % 15) / 100) : 3.4 + ((seed % 20) / 10);
    jitter = 0.08;
  } else if (sLower.includes("moist")) {
    baseVal = sLower.includes("press") ? 42.0 + ((seed % 30) / 10) : 7.2 + ((seed % 20) / 10); // %
    jitter = 0.45;
  } else if (sLower.includes("bw") || sLower.includes("weight") || sLower.includes("grammage")) {
    baseVal = 205 + (seed % 25); // 205 - 230 g/m²
    jitter = 1.8;
  } else if (sLower.includes("draw")) {
    baseVal = 1.85 + ((seed % 40) / 100); // 1.85 - 2.25 %
    jitter = 0.12;
  } else if (sLower.includes("vib")) {
    baseVal = 1.35 + ((seed % 30) / 20); // 1.35 - 2.85 mm/s
    jitter = 0.25;
  } else if (sLower.includes("ph")) {
    baseVal = 3.2 + ((seed % 15) / 10); // 3.2 - 4.7
    jitter = 0.18;
  } else if (sLower.includes("bright")) {
    baseVal = 87.5 + ((seed % 25) / 10); // 87.5 - 90.0 % ISO
    jitter = 0.4;
  } else if (sLower.includes("kappa")) {
    baseVal = 27.0 + ((seed % 60) / 10); // 27.0 - 33.0
    jitter = 0.8;
  } else if (sLower.includes("flow") || sLower.includes("rate")) {
    baseVal = 240 + (seed % 80); // 240 - 320 m³/h
    jitter = 6.0;
  } else if (sLower.includes("tension")) {
    baseVal = 2.1 + ((seed % 20) / 20); // 2.1 - 3.1 kN/m
    jitter = 0.18;
  } else if (sLower.includes("charbed") || sLower.includes("bed")) {
    baseVal = 920 + (seed % 60); // 920 - 980 °C
    jitter = 12.0;
  } else if (sLower.includes("head") || sLower.includes("level")) {
    baseVal = 2.8 + ((seed % 20) / 20); // 2.8 - 3.8 m
    jitter = 0.15;
  } else {
    baseVal += uniqueOffset * 10;
  }

  const values = [];
  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now - i * stepMs).toISOString();
    // Unique combined sinusoidal harmonic per signal
    const harmonic =
      Math.sin(i / freq1 + phase1) * 0.7 +
      Math.cos(i / freq2 + phase2) * 0.3;
    const noise = harmonic * jitter;
    const value = Number((baseVal + noise).toFixed(2));
    values.push({ time, value });
  }

  const rawVals = values.map((v) => v.value);
  const min = Math.min(...rawVals);
  const max = Math.max(...rawVals);
  const average = Number((rawVals.reduce((a, b) => a + b, 0) / rawVals.length).toFixed(2));

  return {
    values,
    stats: {
      count: values.length,
      min,
      max,
      average,
      firstValue: rawVals[0],
      lastValue: rawVals[rawVals.length - 1],
      firstTimestamp: values[0].time,
      lastTimestamp: values[values.length - 1].time,
    },
  };
}
