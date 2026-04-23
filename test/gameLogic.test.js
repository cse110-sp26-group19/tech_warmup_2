const {
    SYMBOLS,
    SYMBOL_KEYS,
    STANDARD_COUNTS,
    HIGHRISK_COUNTS,
    RISK_MULTIPLIER,
    DEFAULT_JACKPOT_SEED,
    calculatePayout,
    getRiskTier,
    getRiskMultiplier,
    buildReelStrip,
    evaluateSpin,
} = require('../product/script');

/* ================================================================
   Constants
   ================================================================ */
describe('constants', () => {
    test('SYMBOLS contains every expected key', () => {
        const expected = ['coral', 'pearl', 'temple', 'leviathan', 'crown', 'trident'];
        expect(Object.keys(SYMBOLS).sort()).toEqual(expected.sort());
    });

    test('each symbol has a positive value and rarity', () => {
        for (const key of SYMBOL_KEYS) {
            expect(SYMBOLS[key].value).toBeGreaterThan(0);
            expect(SYMBOLS[key].rarity).toBeGreaterThan(0);
        }
    });

    test('trident is the highest-value, highest-rarity symbol', () => {
        const maxValue = Math.max(...SYMBOL_KEYS.map(k => SYMBOLS[k].value));
        const maxRarity = Math.max(...SYMBOL_KEYS.map(k => SYMBOLS[k].rarity));
        expect(SYMBOLS.trident.value).toBe(maxValue);
        expect(SYMBOLS.trident.rarity).toBe(maxRarity);
    });

    test('RISK_MULTIPLIER increases with risk', () => {
        expect(RISK_MULTIPLIER.low).toBeLessThan(RISK_MULTIPLIER.medium);
        expect(RISK_MULTIPLIER.medium).toBeLessThan(RISK_MULTIPLIER.high);
    });

    test('HIGHRISK_COUNTS has fewer crowns than STANDARD_COUNTS', () => {
        expect(HIGHRISK_COUNTS.crown).toBeLessThan(STANDARD_COUNTS.crown);
    });

    test('DEFAULT_JACKPOT_SEED is a positive integer', () => {
        expect(Number.isInteger(DEFAULT_JACKPOT_SEED)).toBe(true);
        expect(DEFAULT_JACKPOT_SEED).toBeGreaterThan(0);
    });
});

/* ================================================================
   calculatePayout
   ================================================================ */
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
});

/* ================================================================
   getRiskTier
   ================================================================ */
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
    });
});

/* ================================================================
   getRiskMultiplier
   ================================================================ */
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

/* ================================================================
   buildReelStrip
   ================================================================ */
describe('buildReelStrip', () => {
    function tally(arr) {
        return arr.reduce((acc, sym) => {
            acc[sym] = (acc[sym] || 0) + 1;
            return acc;
        }, {});
    }

    test('produces a strip with the correct total length', () => {
        const strip = buildReelStrip(STANDARD_COUNTS);
        const expectedLength = Object.values(STANDARD_COUNTS).reduce((a, b) => a + b, 0);
        expect(strip).toHaveLength(expectedLength);
    });

    test('preserves the exact symbol frequencies', () => {
        const strip = buildReelStrip(STANDARD_COUNTS);
        expect(tally(strip)).toEqual(STANDARD_COUNTS);
    });

    test('works for the high-risk counts', () => {
        const strip = buildReelStrip(HIGHRISK_COUNTS);
        expect(tally(strip)).toEqual(HIGHRISK_COUNTS);
    });

    test('returns an empty array for an empty counts map', () => {
        expect(buildReelStrip({})).toEqual([]);
    });

    test('uses the provided RNG deterministically', () => {
        const sequence = [0.1, 0.9, 0.4, 0.25, 0.75, 0.5, 0.33, 0.66, 0.8, 0.05];
        const makeRng = () => {
            let i = 0;
            return () => sequence[i++ % sequence.length];
        };

        const a = buildReelStrip(STANDARD_COUNTS, makeRng());
        const b = buildReelStrip(STANDARD_COUNTS, makeRng());
        expect(a).toEqual(b);
    });

    test('does not mutate the input counts object', () => {
        const counts = { ...STANDARD_COUNTS };
        const snapshot = { ...counts };
        buildReelStrip(counts);
        expect(counts).toEqual(snapshot);
    });
});

/* ================================================================
   evaluateSpin — jackpot
   ================================================================ */
describe('evaluateSpin — jackpot', () => {
    test('three tridents awards the entire jackpot pool and resets it', () => {
        const pool = 1_000_000;
        const result = evaluateSpin(['trident', 'trident', 'trident'], 100, 'high', pool);
        expect(result.isJackpot).toBe(true);
        expect(result.payout).toBe(pool);
        expect(result.winReels).toEqual([0, 1, 2]);
        expect(result.newJackpotPool).toBe(DEFAULT_JACKPOT_SEED);
    });

    test('jackpot payout is independent of bet size and risk tier', () => {
        const pool = 500_000;
        const low = evaluateSpin(['trident', 'trident', 'trident'], 1, 'low', pool);
        const high = evaluateSpin(['trident', 'trident', 'trident'], 1000, 'high', pool);
        expect(low.payout).toBe(pool);
        expect(high.payout).toBe(pool);
    });
});

/* ================================================================
   evaluateSpin — three of a kind
   ================================================================ */
describe('evaluateSpin — three of a kind', () => {
    test('three corals on low risk uses value * 3 * rarity * risk', () => {
        const result = evaluateSpin(['coral', 'coral', 'coral'], 100, 'low', 0);
        const sym = SYMBOLS.coral;
        expect(result.payout).toBe(Math.floor(sym.value * 3 * sym.rarity * RISK_MULTIPLIER.low));
        expect(result.winReels).toEqual([0, 1, 2]);
        expect(result.isJackpot).toBe(false);
    });

    test('three crowns on high risk applies the risk multiplier', () => {
        const result = evaluateSpin(['crown', 'crown', 'crown'], 800, 'high', 0);
        const sym = SYMBOLS.crown;
        expect(result.payout).toBe(Math.floor(sym.value * 3 * sym.rarity * RISK_MULTIPLIER.high));
    });

    test('three-of-a-kind does not consume the jackpot pool', () => {
        const pool = 9999;
        const result = evaluateSpin(['pearl', 'pearl', 'pearl'], 100, 'medium', pool);
        expect(result.newJackpotPool).toBe(pool);
    });

    test('fractional payouts are floored to an integer', () => {
        const result = evaluateSpin(['pearl', 'pearl', 'pearl'], 10, 'low', 0);
        expect(Number.isInteger(result.payout)).toBe(true);
        expect(result.payout).toBe(337);
    });
});

/* ================================================================
   evaluateSpin — two of a kind
   ================================================================ */
describe('evaluateSpin — two of a kind', () => {
    test('reels 0+1 matching pays value * 2 * risk', () => {
        const result = evaluateSpin(['coral', 'coral', 'pearl'], 100, 'low', 0);
        expect(result.payout).toBe(SYMBOLS.coral.value * 2 * RISK_MULTIPLIER.low);
        expect(result.winReels).toEqual([0, 1]);
    });

    test('reels 1+2 matching pays value * 2 * risk', () => {
        const result = evaluateSpin(['coral', 'pearl', 'pearl'], 100, 'medium', 0);
        expect(result.payout).toBe(SYMBOLS.pearl.value * 2 * RISK_MULTIPLIER.medium);
        expect(result.winReels).toEqual([1, 2]);
    });

    test('reels 0+2 matching (different middle) does NOT count as a win', () => {
        const result = evaluateSpin(['coral', 'pearl', 'coral'], 100, 'low', 500);
        expect(result.payout).toBe(0);
        expect(result.winReels).toEqual([]);
        expect(result.newJackpotPool).toBe(600);
    });
});

/* ================================================================
   evaluateSpin — no win
   ================================================================ */
describe('evaluateSpin — no win', () => {
    test('no matches returns 0 payout and feeds the bet into the jackpot pool', () => {
        const pool = 10_000;
        const bet = 250;
        const result = evaluateSpin(['coral', 'pearl', 'temple'], bet, 'low', pool);
        expect(result.payout).toBe(0);
        expect(result.winReels).toEqual([]);
        expect(result.isJackpot).toBe(false);
        expect(result.newJackpotPool).toBe(pool + bet);
    });

    test('losing bets accumulate in the jackpot pool across calls', () => {
        let pool = 0;
        const bets = [10, 20, 30];
        for (const b of bets) {
            const r = evaluateSpin(['coral', 'pearl', 'temple'], b, 'low', pool);
            pool = r.newJackpotPool;
        }
        expect(pool).toBe(60);
    });
});

/* ================================================================
   evaluateSpin — validation
   ================================================================ */
describe('evaluateSpin — validation', () => {
    test('throws when results is not an array of length 3', () => {
        expect(() => evaluateSpin(['coral', 'coral'], 100, 'low', 0)).toThrow();
        expect(() => evaluateSpin('coral', 100, 'low', 0)).toThrow();
        expect(() => evaluateSpin(null, 100, 'low', 0)).toThrow();
    });

    test('throws on an unknown risk tier', () => {
        expect(() => evaluateSpin(['coral', 'pearl', 'temple'], 100, 'extreme', 0)).toThrow(/risk tier/);
    });
});
