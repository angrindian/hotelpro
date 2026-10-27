import { describe, expect, it } from 'vitest';
import { datesOverlap, isValidStay } from './dateRules.js';

describe('stay date rules', () => {
  it('accepts a checkout after check-in', () => { expect(isValidStay(new Date('2026-11-01'), new Date('2026-11-03'))).toBe(true); });
  it('rejects checkout equal to or before check-in', () => { expect(isValidStay(new Date('2026-11-01'), new Date('2026-11-01'))).toBe(false); expect(isValidStay(new Date('2026-11-02'), new Date('2026-11-01'))).toBe(false); });
  it('detects overlapping stays but permits checkout/checkin on same day', () => { expect(datesOverlap(new Date('2026-11-01'), new Date('2026-11-04'), new Date('2026-11-03'), new Date('2026-11-06'))).toBe(true); expect(datesOverlap(new Date('2026-11-01'), new Date('2026-11-03'), new Date('2026-11-03'), new Date('2026-11-06'))).toBe(false); });
});
