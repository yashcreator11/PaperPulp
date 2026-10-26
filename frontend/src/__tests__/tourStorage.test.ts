import { describe, it, expect, beforeEach } from 'vitest';
import {
  PAGE_TOUR_KEY,
  BACKEND_TOUR_KEY,
  getPageTourState,
  markPageCompleted,
  setBackendTourDone,
  getBackendTourStatus,
  clearTourData,
} from '../hooks/tourStorage';

describe('tourStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getPageTourState', () => {
    it('returns empty object when nothing is stored', () => {
      expect(getPageTourState()).toEqual({});
    });

    it('returns parsed state when data exists', () => {
      localStorage.setItem(PAGE_TOUR_KEY, JSON.stringify({ dashboard: true }));
      expect(getPageTourState()).toEqual({ dashboard: true });
    });

    it('returns empty object on corrupted JSON', () => {
      localStorage.setItem(PAGE_TOUR_KEY, 'not-valid-json{{');
      expect(getPageTourState()).toEqual({});
    });
  });

  describe('markPageCompleted', () => {
    it('marks a page as completed', () => {
      markPageCompleted('dashboard');
      expect(getPageTourState().dashboard).toBe(true);
    });

    it('preserves existing completed pages when marking a new one', () => {
      markPageCompleted('dashboard');
      markPageCompleted('assets');
      const state = getPageTourState();
      expect(state.dashboard).toBe(true);
      expect(state.assets).toBe(true);
    });

    it('marks multiple pages independently', () => {
      markPageCompleted('devices');
      markPageCompleted('signals');
      const state = getPageTourState();
      expect(state.devices).toBe(true);
      expect(state.signals).toBe(true);
    });
  });

  describe('setBackendTourDone', () => {
    it('sets backend tour done in localStorage', () => {
      setBackendTourDone();
      expect(localStorage.getItem(BACKEND_TOUR_KEY)).toBe('true');
    });
  });

  describe('getBackendTourStatus', () => {
    it('returns null when not set', () => {
      expect(getBackendTourStatus()).toBeNull();
    });

    it('returns "true" after setBackendTourDone', () => {
      setBackendTourDone();
      expect(getBackendTourStatus()).toBe('true');
    });
  });

  describe('clearTourData', () => {
    it('removes all tour keys from localStorage', () => {
      markPageCompleted('dashboard');
      setBackendTourDone();
      clearTourData();
      expect(localStorage.getItem(PAGE_TOUR_KEY)).toBeNull();
      expect(localStorage.getItem(BACKEND_TOUR_KEY)).toBeNull();
    });

    it('does not throw when nothing is stored', () => {
      expect(() => clearTourData()).not.toThrow();
    });
  });
});
