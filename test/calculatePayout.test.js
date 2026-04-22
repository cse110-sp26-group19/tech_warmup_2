const { calculatePayout } = require('../src/game/gameLogic');

describe('calculatePayout', () => {
    test('multiplies bet by multiplier', () => {
        expect(calculatePayout(10, 2)).toBe(20);
    });

    test('returns 0 when bet is 0', () => {
        expect(calculatePayout(0, 5)).toBe(0);
    });

    test('returns 0 when multiplier is 0', () => {
        expect(calculatePayout(100, 0)).toBe(0);
    });

    test('handles fractional multipliers', () => {
        expect(calculatePayout(100, 1.5)).toBeCloseTo(150);
    });

    test('handles large values without overflow for realistic inputs', () => {
        expect(calculatePayout(1000, 1000)).toBe(1_000_000);
    });

    test('handles negative multipliers (mathematical consistency)', () => {
        expect(calculatePayout(50, -2)).toBe(-100);
    });
});
