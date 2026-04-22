const {
    evaluateSpin,
    SYMBOLS,
    RISK_MULTIPLIER,
    DEFAULT_JACKPOT_SEED,
} = require('../src/game/gameLogic');

describe('evaluateSpin — jackpot', () => {
    test('three tridents awards the entire jackpot pool and resets it to the seed', () => {
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

describe('evaluateSpin — three of a kind', () => {
    test('three corals on low risk uses value * 3 * rarity * risk multiplier', () => {
        const bet = 100;
        const result = evaluateSpin(['coral', 'coral', 'coral'], bet, 'low', 0);
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
        // pearl.rarity is 1.5, so 75 * 3 * 1.5 * 1 = 337.5 -> floor -> 337
        const result = evaluateSpin(['pearl', 'pearl', 'pearl'], 10, 'low', 0);
        expect(Number.isInteger(result.payout)).toBe(true);
        expect(result.payout).toBe(337);
    });
});

describe('evaluateSpin — two of a kind', () => {
    test('two matching on reels 0+1 pays value * 2 * risk', () => {
        const result = evaluateSpin(['coral', 'coral', 'pearl'], 100, 'low', 0);
        expect(result.payout).toBe(SYMBOLS.coral.value * 2 * RISK_MULTIPLIER.low);
        expect(result.winReels).toEqual([0, 1]);
    });

    test('two matching on reels 1+2 pays value * 2 * risk', () => {
        const result = evaluateSpin(['coral', 'pearl', 'pearl'], 100, 'medium', 0);
        expect(result.payout).toBe(SYMBOLS.pearl.value * 2 * RISK_MULTIPLIER.medium);
        expect(result.winReels).toEqual([1, 2]);
    });

    test('reels 0+2 matching (with a different middle) does NOT count as a win', () => {
        const result = evaluateSpin(['coral', 'pearl', 'coral'], 100, 'low', 500);
        expect(result.payout).toBe(0);
        expect(result.winReels).toEqual([]);
        expect(result.newJackpotPool).toBe(600);
    });

    test('when reels 0+1 match, reels 1+2 branch is NOT also evaluated', () => {
        const result = evaluateSpin(['coral', 'coral', 'crown'], 100, 'low', 0);
        expect(result.winReels).toEqual([0, 1]);
    });
});

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
