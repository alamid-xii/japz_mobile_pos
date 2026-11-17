import { describe,it,expect } from 'vitest';
import { philippineDate,closingAfter,attendanceTotals } from '../services/attendanceTime.js';
describe('Philippine closing-time rules', () => {
  it('groups a UTC afternoon punch into the next Philippine calendar day', () => {
    expect(philippineDate('2026-11-16T17:00:00Z')).toBe('2026-11-17');
  });
  it('closes at 8 PM Philippine time regardless of host timezone', () => {
    expect(closingAfter('2026-11-16T01:00:00Z','20:00').toISOString()).toBe('2026-11-16T12:00:00.000Z');
  });
  it('supports a closing time after midnight', () => {
    expect(closingAfter('2026-11-16T15:00:00Z','03:00:00').toISOString()).toBe('2026-11-16T19:00:00.000Z');
  });
  it('never makes a zero-length or negative shift at the exact closing boundary', () => {
    expect(closingAfter('2026-11-16T12:00:00Z','20:00').toISOString()).toBe('2026-11-17T12:00:00.000Z');
  });
  it('rejects invalid closing times and ignores invalid punches', () => {
    expect(() => closingAfter(new Date(),'25:00')).toThrow();
    expect(closingAfter('bad','20:00')).toBeNull();
  });
  it('preserves the existing break and undertime calculation', () => {
    expect(attendanceTotals('2026-11-16T01:00Z','2026-11-16T06:00Z',{ breakMinutes:60,regularHoursPerDay:8 })).toEqual({totalHours:4,undertimeMinutes:240});
    expect(() => attendanceTotals('2026-11-16T06:00Z','2026-11-16T01:00Z',{})).toThrow();
  });
});
