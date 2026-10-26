import { describe, it, expect } from '@jest/globals';
import { SIGNALS } from '../signals.js';
import { previousRCA } from '../RCA.js';

// ─── SIGNALS ──────────────────────────────────────────────────────────────────

describe('SIGNALS', () => {
  const EXPECTED_SIGNALS = ['Current', 'Voltage', 'FlowRate', 'Temperature', 'RPM', 'Torque', 'Vibration', 'Frequency'];

  it('exports all 8 expected signal types', () => {
    EXPECTED_SIGNALS.forEach(name => {
      expect(SIGNALS).toHaveProperty(name);
    });
  });

  it('every signal has unit, min, and max', () => {
    for (const [name, sig] of Object.entries(SIGNALS)) {
      expect(typeof sig.unit).toBe('string', `${name}.unit should be string`);
      expect(typeof sig.min).toBe('number', `${name}.min should be number`);
      expect(typeof sig.max).toBe('number', `${name}.max should be number`);
    }
  });

  it('every signal min is less than max', () => {
    for (const [name, sig] of Object.entries(SIGNALS)) {
      expect(sig.min).toBeLessThan(sig.max);
    }
  });

  it('Current range is 0–50 A', () => {
    expect(SIGNALS.Current).toMatchObject({ unit: 'A', min: 0, max: 50 });
  });

  it('Voltage range is 18–26 V', () => {
    expect(SIGNALS.Voltage).toMatchObject({ unit: 'V', min: 18, max: 26 });
  });

  it('Temperature range covers negative min (−10°C)', () => {
    expect(SIGNALS.Temperature.min).toBeLessThan(0);
  });

  it('Frequency range is 45–65 Hz', () => {
    expect(SIGNALS.Frequency).toMatchObject({ unit: 'Hz', min: 45, max: 65 });
  });
});

// ─── previousRCA ─────────────────────────────────────────────────────────────

describe('previousRCA', () => {
  it('has required top-level fields', () => {
    expect(previousRCA).toHaveProperty('rcaId');
    expect(previousRCA).toHaveProperty('assetName');
    expect(previousRCA).toHaveProperty('summary');
    expect(previousRCA).toHaveProperty('signals');
    expect(previousRCA).toHaveProperty('overallConfidence');
  });

  it('overallConfidence is between 0 and 1', () => {
    expect(previousRCA.overallConfidence).toBeGreaterThan(0);
    expect(previousRCA.overallConfidence).toBeLessThanOrEqual(1);
  });

  it('signals is a non-empty array', () => {
    expect(Array.isArray(previousRCA.signals)).toBe(true);
    expect(previousRCA.signals.length).toBeGreaterThan(0);
  });

  it('each signal has signalName, unit, issues, and recommendedActions', () => {
    for (const sig of previousRCA.signals) {
      expect(sig).toHaveProperty('signalName');
      expect(sig).toHaveProperty('unit');
      expect(sig).toHaveProperty('issues');
      expect(sig).toHaveProperty('recommendedActions');
    }
  });

  it('each issue has type, firstSeen, lastSeen, severityScore', () => {
    for (const sig of previousRCA.signals) {
      for (const issue of sig.issues) {
        expect(issue).toHaveProperty('type');
        expect(issue).toHaveProperty('firstSeen');
        expect(issue).toHaveProperty('lastSeen');
        expect(issue).toHaveProperty('severityScore');
        expect(issue.severityScore).toBeGreaterThan(0);
        expect(issue.severityScore).toBeLessThanOrEqual(1);
      }
    }
  });

  it('each recommended action has actionCode, description, severity, and confidence', () => {
    for (const sig of previousRCA.signals) {
      for (const action of sig.recommendedActions) {
        expect(action).toHaveProperty('actionCode');
        expect(action).toHaveProperty('description');
        expect(action).toHaveProperty('severity');
        expect(action).toHaveProperty('confidence');
        expect(action.confidence).toBeGreaterThan(0);
        expect(action.confidence).toBeLessThanOrEqual(1);
      }
    }
  });

  it('includes a Current signal', () => {
    expect(previousRCA.signals.some(s => s.signalName === 'Current')).toBe(true);
  });

  it('includes a Voltage signal', () => {
    expect(previousRCA.signals.some(s => s.signalName === 'Voltage')).toBe(true);
  });
});
