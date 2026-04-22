const { buildReelStrip, STANDARD_COUNTS, HIGHRISK_COUNTS } = require('../src/game/gameLogic');

/**
 * Counts occurrences of each item in an array.
 * @param {string[]} arr
 * @returns {Record<string, number>}
 */
function tally(arr) {
    return arr.reduce((acc, sym) => {
        acc[sym] = (acc[sym] || 0) + 1;
        return acc;
    }, {});
}

describe('buildReelStrip', () => {
    test('produces a strip with the total length of the counts map', () => {
        const strip = buildReelStrip(STANDARD_COUNTS);
        const expectedLength = Object.values(STANDARD_COUNTS).reduce((a, b) => a + b, 0);
        expect(strip).toHaveLength(expectedLength);
    });

    test('preserves the exact symbol frequencies from the counts map', () => {
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

    test('only contains keys present in the counts map', () => {
        const strip = buildReelStrip(STANDARD_COUNTS);
        const validKeys = new Set(Object.keys(STANDARD_COUNTS));
        for (const key of strip) {
            expect(validKeys.has(key)).toBe(true);
        }
    });

    test('uses the provided RNG deterministically', () => {
        // A fixed-sequence RNG so shuffling is fully deterministic.
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
