export const SIGNALS = {
  // Paper Machine Process & Break Signals
  DrawDiff: { unit: "%", min: 0.8, max: 3.2 },
  CouchVacuum: { unit: "kPa", min: -85, max: -40 },
  BasisWeight: { unit: "g/m²", min: 195, max: 215 },
  WebMoisture: { unit: "%", min: 4.5, max: 10.5 },
  WebTension: { unit: "kN/m", min: 0.6, max: 3.5 },
  NipPressure: { unit: "kN/m", min: 500, max: 1550 },
  DryerSteamPress: { unit: "bar", min: 0.8, max: 9.0 },

  // Fiberline & Bleaching
  CookTemp: { unit: "°C", min: 140, max: 175 },
  DigesterPressure: { unit: "bar g", min: 9.0, max: 11.7 },
  ResidEA: { unit: "g/L", min: 2.0, max: 4.0 },
  PulpConsistency: { unit: "%", min: 8.0, max: 13.0 },
  WashWaterFlow: { unit: "m³/t", min: 8.0, max: 10.0 },
  OxygenTemp: { unit: "°C", min: 80, max: 110 },
  ClO2DosingFlow: { unit: "kg/odt", min: 4.6, max: 13.3 },
  D0EndPH: { unit: "pH", min: 2.0, max: 4.5 },
  Brightness: { unit: "% ISO", min: 85, max: 91 },
  Kappa: { unit: "kappa", min: 25, max: 35 },

  // Chemical Recovery Loop
  BlackLiquorSolids: { unit: "%", min: 65, max: 85 },
  RecoverySteamPress: { unit: "bar", min: 80, max: 110 },
  CharBedTemp: { unit: "°C", min: 900, max: 1200 },
  CausticizingEfficiency: { unit: "%", min: 78, max: 83 },
  LimeKilnTemp: { unit: "°C", min: 900, max: 1100 },

  // Generic Machine Condition & Electrical
  Current: { unit: "A", min: 0, max: 50 },
  Voltage: { unit: "V", min: 18, max: 26 },
  FlowRate: { unit: "L/min", min: 1, max: 200 },
  Temperature: { unit: "°C", min: -10, max: 80 },
  RPM: { unit: "rpm", min: 100, max: 1600 },
  Torque: { unit: "Nm", min: 0, max: 500 },
  Vibration: { unit: "mm/s", min: 0, max: 10 },
  Frequency: { unit: "Hz", min: 45, max: 65 }
};
