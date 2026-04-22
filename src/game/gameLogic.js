/**
 * Pure game logic for the Atlantis slot machine.
 *
 * These functions are intentionally side-effect free so they can be
 * unit tested in isolation. The UI layer in product/script.js mirrors
 * the same rules but is coupled to the DOM.
 */

const SYMBOLS = {
    coral:     { name: "Tidecaller's Sapphire", icon: 'assets/icons/blue-gem.png',  value: 50,  rarity: 1 },
    pearl:     { name: "Siren's Emerald",       icon: 'assets/icons/green-gem.png', value: 75,  rarity: 1.5 },
    temple:    { name: 'Heart of the Abyss',    icon: 'assets/icons/pink-gem.png',  value: 125, rarity: 2 },
    leviathan: { name: 'The Sea King',          icon: 'assets/icons/poseidon.png',  value: 200, rarity: 3 },
    crown:     { name: 'Crown of Atlantis',     icon: 'assets/icons/crown.png',     value: 400, rarity: 5 },
    trident:   { name: "Poseidon's Trident",    icon: 'assets/icons/trident.png',   value: 750, rarity: 10 },
};

const SYMBOL_KEYS = Object.keys(SYMBOLS);

const STANDARD_COUNTS = { coral: 7, pearl: 7, temple: 6, leviathan: 5, crown: 3, trident: 2 };
const HIGHRISK_COUNTS = { coral: 9, pearl: 7, temple: 6, leviathan: 5, crown: 1, trident: 2 };

const RISK_MULTIPLIER = { low: 1, medium: 2, high: 4 };

const DEFAULT_JACKPOT_SEED = 69420420;

/**
 * Calculates the payout for a given bet and multiplier.
 * @param {number} bet
 * @param {number} multiplier
 * @returns {number}
 */
function calculatePayout(bet, multiplier) {
    return bet * multiplier;
}

/**
 * Returns the risk tier for a given bet amount.
 * @param {number} bet
 * @returns {'low'|'medium'|'high'}
 */
function getRiskTier(bet) {
    if (bet <= 250) return 'low';
    if (bet <= 750) return 'medium';
    return 'high';
}

/**
 * Returns the payout multiplier associated with a risk tier.
 * @param {'low'|'medium'|'high'} tier
 * @returns {number}
 */
function getRiskMultiplier(tier) {
    return RISK_MULTIPLIER[tier];
}

/**
 * Builds a shuffled reel strip from a symbol frequency map.
 *
 * @param {Object} counts - Map of symbol key to number of appearances on the strip.
 * @param {() => number} [rng=Math.random] - Optional RNG for deterministic shuffling in tests.
 * @returns {string[]} Shuffled array of symbol keys.
 */
function buildReelStrip(counts, rng = Math.random) {
    const strip = [];
    for (const [sym, count] of Object.entries(counts)) {
        for (let i = 0; i < count; i++) strip.push(sym);
    }
    for (let i = strip.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [strip[i], strip[j]] = [strip[j], strip[i]];
    }
    return strip;
}

/**
 * Evaluates the outcome of a single spin.
 *
 * Payout rules:
 *   - Three tridents: jackpot (entire pool), pool resets to seed value
 *   - Three of a kind: value * 3 * rarity * risk multiplier
 *   - Two of a kind on reels 0+1 or 1+2: value * 2 * risk multiplier
 *   - No match: bet is added to the jackpot pool
 *
 * @param {string[]} results - Three symbol keys representing the reel outcome.
 * @param {number} bet - Amount wagered this spin.
 * @param {'low'|'medium'|'high'} tier - Risk tier.
 * @param {number} jackpotPool - Current jackpot pool.
 * @returns {{
 *   payout: number,
 *   winReels: number[],
 *   isJackpot: boolean,
 *   newJackpotPool: number
 * }}
 */
function evaluateSpin(results, bet, tier, jackpotPool) {
    if (!Array.isArray(results) || results.length !== 3) {
        throw new Error('results must be an array of exactly three symbol keys');
    }
    const risk = RISK_MULTIPLIER[tier];
    if (risk === undefined) {
        throw new Error(`Unknown risk tier: ${tier}`);
    }

    const [s0, s1, s2] = results;

    if (s0 === 'trident' && s1 === 'trident' && s2 === 'trident') {
        return {
            payout: jackpotPool,
            winReels: [0, 1, 2],
            isJackpot: true,
            newJackpotPool: DEFAULT_JACKPOT_SEED,
        };
    }

    if (s0 === s1 && s1 === s2) {
        const sym = SYMBOLS[s0];
        return {
            payout: Math.floor(sym.value * 3 * sym.rarity * risk),
            winReels: [0, 1, 2],
            isJackpot: false,
            newJackpotPool: jackpotPool,
        };
    }

    if (s0 === s1) {
        return {
            payout: Math.floor(SYMBOLS[s0].value * 2 * risk),
            winReels: [0, 1],
            isJackpot: false,
            newJackpotPool: jackpotPool,
        };
    }

    if (s1 === s2) {
        return {
            payout: Math.floor(SYMBOLS[s1].value * 2 * risk),
            winReels: [1, 2],
            isJackpot: false,
            newJackpotPool: jackpotPool,
        };
    }

    return {
        payout: 0,
        winReels: [],
        isJackpot: false,
        newJackpotPool: jackpotPool + bet,
    };
}

module.exports = {
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
};
