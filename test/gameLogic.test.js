const {
    SYMBOLS,
    SYMBOL_KEYS,
    STANDARD_COUNTS,
    HIGHRISK_COUNTS,
    RISK_MULTIPLIER,
    DEFAULT_JACKPOT_SEED,
} = require('../src/game/gameLogic');

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
