const { getRiskTier, getRiskMultiplier, RISK_MULTIPLIER } = require('../src/game/gameLogic');

describe('getRiskTier', () => {
    test('returns "low" for bets at or below 250', () => {
        expect(getRiskTier(1)).toBe('low');
        expect(getRiskTier(100)).toBe('low');
        expect(getRiskTier(250)).toBe('low');
    });

    test('returns "medium" for bets between 251 and 750', () => {
        expect(getRiskTier(251)).toBe('medium');
        expect(getRiskTier(500)).toBe('medium');
        expect(getRiskTier(750)).toBe('medium');
    });

    test('returns "high" for bets above 750', () => {
        expect(getRiskTier(751)).toBe('high');
        expect(getRiskTier(1000)).toBe('high');
        expect(getRiskTier(5000)).toBe('high');
    });

    test('treats 0 and negative bets as low tier (mathematical consistency)', () => {
        expect(getRiskTier(0)).toBe('low');
        expect(getRiskTier(-100)).toBe('low');
    });
});

describe('getRiskMultiplier', () => {
    test('returns the matching RISK_MULTIPLIER value for each tier', () => {
        expect(getRiskMultiplier('low')).toBe(RISK_MULTIPLIER.low);
        expect(getRiskMultiplier('medium')).toBe(RISK_MULTIPLIER.medium);
        expect(getRiskMultiplier('high')).toBe(RISK_MULTIPLIER.high);
    });

    test('returns undefined for unknown tiers', () => {
        expect(getRiskMultiplier('extreme')).toBeUndefined();
    });
});
