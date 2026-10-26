import { CORRELATION_RULES } from '../coRelationalRules.js';

describe('CORRELATION_RULES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(CORRELATION_RULES)).toBe(true);
    expect(CORRELATION_RULES.length).toBeGreaterThan(0);
  });

  it('every rule has a unique id', () => {
    const ids = CORRELATION_RULES.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('every rule has required fields: id, when, cause, confidence', () => {
    CORRELATION_RULES.forEach(rule => {
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('when');
      expect(rule).toHaveProperty('cause');
      expect(rule).toHaveProperty('confidence');
    });
  });

  it('every rule confidence is between 0 and 1', () => {
    CORRELATION_RULES.forEach(rule => {
      expect(rule.confidence).toBeGreaterThanOrEqual(0);
      expect(rule.confidence).toBeLessThanOrEqual(1);
    });
  });

  it('every rule.when is a non-empty array of strings', () => {
    CORRELATION_RULES.forEach(rule => {
      expect(Array.isArray(rule.when)).toBe(true);
      expect(rule.when.length).toBeGreaterThan(0);
      rule.when.forEach(condition => {
        expect(typeof condition).toBe('string');
      });
    });
  });

  it('CURRENT_SENSOR_FAULT rule has high confidence (>=0.85)', () => {
    const rule = CORRELATION_RULES.find(r => r.id === 'CURRENT_SENSOR_FAULT');
    expect(rule).toBeDefined();
    expect(rule.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('POWER_SUPPLY_INSTABILITY triggers on Voltage and Current signals', () => {
    const rule = CORRELATION_RULES.find(r => r.id === 'POWER_SUPPLY_INSTABILITY');
    expect(rule).toBeDefined();
    expect(rule.when).toContain('Voltage_LOW');
    expect(rule.when).toContain('Current_HIGH');
  });
});
