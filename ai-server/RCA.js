export const previousRCA = {
  // this is the previous RCA JSON you gave (no explicit rcaId field in the block you pasted).
  // We'll supply suggested RCA ids to reference in the system prompt.
  rcaId: "RCA-EXAMPLE-001",
  assetName: "varadasset",
  summary:
    "Current repeatedly exceeds max threshold (50 A) and intermittently reports negative values, while Voltage shows high spikes above 34 V and low dips near 9–12 V; pattern suggests either a failing sensor/measurement wiring or real electrical instability. Prioritize safe shutdown if current spikes persist, verify sensors and wiring, then inspect power supply and motor load.",
  signals: [
    {
      signalName: "Current",
      unit: "A",
      issues: [
        {
          type: "aboveMax",
          firstSeen: "2025-12-11T09:12:41.543Z",
          lastSeen: "2025-12-11T09:13:02.543Z",
          severityScore: 0.95
        },
        {
          type: "negativeValue",
          firstSeen: "2025-12-11T09:12:55.543Z",
          lastSeen: "2025-12-11T09:13:12.543Z",
          severityScore: 0.85
        }
      ],
      recommendedActions: [
        {
          actionCode: "VERIFY_SENSOR_QC",
          description:
            "Verify probe wiring and sensor calibration for Current channel (check grounding and connectors). If measurement wiring is damaged or loose, fix/replace sensor before mechanical interventions.",
          severity: "HIGH",
          expectedOutcome:
            "Eliminate false negatives/positives due to sensor wiring; reduce spurious readings.",
          role: "Maintenance Electrical",
          safetyRiskIfNotPerformed: "Medium",
          matchedHistoricalRCAs: ["RCA-789"],
          confidence: 0.88
        },
        {
          actionCode: "ISOLATE_AND_INSPECT",
          description:
            "If high-current spikes continue after sensor verification, perform an IMMEDIATE STOP of the affected machine, isolate power and inspect motor, load, and drive for overload/fault.",
          severity: "IMMEDIATE",
          expectedOutcome: "Prevent motor overheating/damage and tripped breakers.",
          role: "Operator / Maintenance Electrical",
          safetyRiskIfNotPerformed: "High",
          matchedHistoricalRCAs: ["RCA-1206"],
          confidence: 0.92
        }
      ]
    },
    {
      signalName: "Voltage",
      unit: "V",
      issues: [
        {
          type: "aboveMax",
          firstSeen: "2025-12-11T09:12:45.543Z",
          lastSeen: "2025-12-11T09:13:28.543Z",
          severityScore: 0.82
        }
      ],
      recommendedActions: [
        {
          actionCode: "CHECK_POWER_SUPPLY",
          description:
            "Check upstream power supply and DC bus for instability; inspect power routing and filters (possible intermittent supply voltage).",
          severity: "HIGH",
          expectedOutcome:
            "Stabilize voltage and remove harmful transients that can damage control electronics.",
          role: "Electrical Technician",
          safetyRiskIfNotPerformed: "High",
          matchedHistoricalRCAs: ["RCA-542"],
          confidence: 0.84
        }
      ]
    }
  ],
  overallConfidence: 0.86
};