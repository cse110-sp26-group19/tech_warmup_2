'use strict';

/* ====================================================================
   PURE GAME LOGIC — testable in isolation via Jest (no DOM required)
   ==================================================================== */

const SYMBOLS = {
    coral:     { name: "Tidecaller's Sapphire", icon: 'assets/icons/blue-gem.png',  value: 50,  rarity: 1 },
    pearl:     { name: "Siren's Emerald",       icon: 'assets/icons/green-gem.png', value: 75,  rarity: 1.5 },
    temple:    { name: 'Heart of the Abyss',    icon: 'assets/icons/pink-gem.png',  value: 125, rarity: 2 },
    leviathan: { name: 'The Sea King',           icon: 'assets/icons/poseidon.png',  value: 200, rarity: 3 },
    crown:     { name: 'Crown of Atlantis',      icon: 'assets/icons/crown.png',     value: 400, rarity: 5 },
    trident:   { name: "Poseidon's Trident",     icon: 'assets/icons/trident.png',   value: 750, rarity: 10 },
};

const SYMBOL_KEYS = Object.keys(SYMBOLS);

const STANDARD_COUNTS = { coral: 7, pearl: 7, temple: 6, leviathan: 5, crown: 3, trident: 2 };
const HIGHRISK_COUNTS = { coral: 9, pearl: 7, temple: 6, leviathan: 5, crown: 1, trident: 2 };

const RISK_MULTIPLIER = { low: 1, medium: 2, high: 4 };

const DEFAULT_JACKPOT_SEED = 69420420;

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
 * Evaluates the outcome of a single spin (pure — no side effects).
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
 * @returns {{ payout: number, winReels: number[], isJackpot: boolean, newJackpotPool: number }}
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

/* ====================================================================
   BROWSER UI — only runs when loaded via <script> in a page
   ==================================================================== */

if (typeof document !== 'undefined' && document.getElementById('hit-button')) {
(function () {

    /* ================================================================
       STATE
       ================================================================ */
    let balance = 1000;
    let totalWagered = 0;
    let totalWon = 0;
    let jackpotPool = DEFAULT_JACKPOT_SEED;
    let isSpinning = false;

    const DEBUG = { forceJackpot: false };

    const reelStrips = { standard: [], highRisk: [] };
    const results = [null, null, null];
    let spinIntervals = [null, null, null];

    /* ================================================================
       DOM
       ================================================================ */
    const $jackpotText    = document.getElementById('jackpot-text');
    const $hitButton      = document.getElementById('hit-button');
    const $tokenInput     = document.getElementById('token-input');
    const $tokenInc       = document.getElementById('token-increment');
    const $tokenDec       = document.getElementById('token-decrement');
    const $balanceAmount  = document.getElementById('balance-amount');
    const $addTokens      = document.getElementById('add-tokens-button');
    const $cashOut        = document.getElementById('cash-out-button');
    const $resultBanner   = document.getElementById('result-banner');
    const $resultText     = document.getElementById('result-text');

    const $reels = [
        document.getElementById('reel-1'),
        document.getElementById('reel-2'),
        document.getElementById('reel-3'),
    ];

    const $slotImgs = [
        document.getElementById('slot-1'),
        document.getElementById('slot-2'),
        document.getElementById('slot-3'),
    ];

    /* ================================================================
       AUDIO
       ================================================================ */
    const SFX = {
        music:   Object.assign(new Audio('assets/Sounds/background-music.mp3'),   { loop: true, volume: 0.35 }),
        bubble:  Object.assign(new Audio('assets/Sounds/bubble-pop.mp3'),        { volume: 0.28 }),
        spin:    Object.assign(new Audio('assets/Sounds/reel-spin.mp3'), { loop: true, volume: 0.55 }),
        hit:     Object.assign(new Audio('assets/Sounds/button-press.mp3'),     { volume: 0.7 }),
        jackpot: Object.assign(new Audio('assets/Sounds/jackpot.mp3'), { volume: 0.8 }),
        splash:  Object.assign(new Audio('assets/Sounds/water-splash.mp3'),   { volume: 0.6 }),
        kaching: Object.assign(new Audio('assets/Sounds/win-kaching.mp3'), { volume: 0.75 }),
    };

    let audioUnlocked = false;

    function unlockAudio() {
        if (audioUnlocked) return;
        audioUnlocked = true;
        SFX.music.play().catch(() => {});
    }
    document.addEventListener('click', unlockAudio, { once: true });

    function playSound(key) {
        if (!audioUnlocked) return;
        const s = SFX[key];
        s.currentTime = 0;
        s.play().catch(() => {});
    }

    function stopSound(key) {
        const s = SFX[key];
        s.pause();
        s.currentTime = 0;
    }

    /* ================================================================
       HELPERS
       ================================================================ */
    function fmt(n) { return Math.floor(n).toLocaleString('en-US'); }

    function stripWhite(src, threshold = 235) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth; c.height = img.naturalHeight;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const d = ctx.getImageData(0, 0, c.width, c.height);
                for (let i = 0; i < d.data.length; i += 4) {
                    if (d.data[i] > threshold && d.data[i+1] > threshold && d.data[i+2] > threshold)
                        d.data[i+3] = 0;
                }
                ctx.putImageData(d, 0, 0);
                resolve(c.toDataURL('image/png'));
            };
            img.src = src;
        });
    }

    let jackpotImgSrc = 'assets/icons/jackpot-banner.png';
    stripWhite(jackpotImgSrc).then(url => { jackpotImgSrc = url; });

    function randomSymbol() {
        return SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)];
    }

    function setSlot(i, key) {
        $slotImgs[i].src = SYMBOLS[key].icon;
        $slotImgs[i].alt = SYMBOLS[key].name;
    }

    /* ================================================================
       UI UPDATES
       ================================================================ */
    let _balFrom = 0;
    let _balRaf = null;

    function updateBalance(animate) {
        const to = balance;
        if (!animate) {
            if (_balRaf) { cancelAnimationFrame(_balRaf); _balRaf = null; }
            $balanceAmount.textContent = fmt(to);
            _balFrom = to;
            return;
        }
        const from = _balFrom;
        const rising = to >= from;
        const duration = Math.min(900, 120 + Math.abs(to - from) * 0.4);
        const start = performance.now();
        if (_balRaf) cancelAnimationFrame(_balRaf);

        $balanceAmount.dataset.dir = rising ? 'up' : 'down';

        function tick(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const cur = Math.round(from + (to - from) * eased);
            $balanceAmount.textContent = fmt(cur);
            $balanceAmount.classList.toggle('shuffling', t < 1);
            if (t < 1) {
                _balRaf = requestAnimationFrame(tick);
            } else {
                $balanceAmount.textContent = fmt(to);
                $balanceAmount.classList.remove('shuffling');
                _balFrom = to;
                _balRaf = null;
            }
        }
        _balRaf = requestAnimationFrame(tick);
        _balFrom = to;
    }

    function flashBalanceGold() {
        updateBalance(true);
        $balanceAmount.classList.remove('win-flash');
        void $balanceAmount.offsetWidth;
        $balanceAmount.classList.add('win-flash');
    }

    function updateTierDisplay() {
        const bet = parseInt($tokenInput.value) || 0;
        const tier = getRiskTier(bet);

        $hitButton.className = `risk-${tier}`;

        document.querySelectorAll('.risk-card').forEach(p => p.classList.remove('active'));
        if (tier === 'low')    document.getElementById('low-risk-card').classList.add('active');
        if (tier === 'medium') document.getElementById('mid-risk-card').classList.add('active');
        if (tier === 'high')   document.getElementById('high-risk-card').classList.add('active');
    }

    function showJackpotWin(amount) {
        playSound('jackpot');
        playSound('splash');
        let overlay = document.getElementById('jackpot-win-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'jackpot-win-overlay';
        overlay.className = 'jackpot-win-overlay';
        overlay.innerHTML = `
            <div class="jackpot-img-glow"></div>
            <img class="jackpot-win-image" src="${jackpotImgSrc}" alt="Jackpot">
            <div class="jackpot-win-label">JACKPOT!!!</div>
            <div class="jackpot-win-amount" id="jpw-amount">0</div>
            <button class="jackpot-win-close">COLLECT WINNINGS</button>
        `;
        document.body.appendChild(overlay);

        for (let i = 0; i < 60; i++) {
            const coin = document.createElement('div');
            coin.className = 'jp-coin';
            const size = 18 + Math.random() * 22;
            coin.style.cssText = `
                width:${size}px; height:${size}px;
                left:${Math.random() * 100}%;
                animation-duration:${1.2 + Math.random() * 2}s;
                animation-delay:${Math.random() * 3}s;
                --spin:${Math.random() > 0.5 ? 360 : -360}deg;
            `;
            overlay.appendChild(coin);
        }

        for (let i = 0; i < 40; i++) {
            const b = document.createElement('div');
            b.className = 'jp-bubble';
            const size = 10 + Math.random() * 40;
            const drift = (Math.random() - 0.5) * 120;
            b.style.cssText = `
                width: ${size}px; height: ${size}px;
                left: ${Math.random() * 100}%;
                animation-duration: ${3 + Math.random() * 4}s;
                animation-delay: ${Math.random() * 3}s;
                --drift: ${drift}px;
            `;
            overlay.appendChild(b);
        }

        requestAnimationFrame(() => overlay.classList.add('show'));

        const kachingTimes = [300, 700, 1100, 1600, 2200, 2900];
        kachingTimes.forEach(t => setTimeout(() => playSound('kaching'), t));

        setTimeout(() => {
            animateCount(document.getElementById('jpw-amount'), amount, 1800);
        }, 1000);

        overlay.querySelector('.jackpot-win-close').addEventListener('click', () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 400);
        });
    }

    function updateJackpot() {
        const str = fmt(jackpotPool);

        let showNumber = false;
        clearInterval(window._jpInterval);
        window._jpInterval = setInterval(() => {
            showNumber = !showNumber;
            rippleJackpot(showNumber ? str : 'JACKPOT!!!');
        }, 2500);
    }

    function popJackpot() {
        $jackpotText.classList.remove('popping');
        void $jackpotText.offsetWidth;
        $jackpotText.classList.add('popping');
    }

    function animateCount(el, to, duration = 1200) {
        const start = performance.now();
        el.classList.remove('counting');
        void el.offsetWidth;
        el.classList.add('counting');
        function tick(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = fmt(to * eased);
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = fmt(to);
        }
        requestAnimationFrame(tick);
    }

    function rippleJackpot(newText) {
        $jackpotText.classList.add('rippling');

        setTimeout(() => {
            $jackpotText.textContent = newText;
        }, 350);

        setTimeout(() => {
            $jackpotText.classList.remove('rippling');
        }, 750);
    }

    function showError(text) {
        $resultBanner.className = 'result-banner show';
        $resultText.textContent = text;
    }

    function hideError() { $resultBanner.className = 'result-banner'; }

    function clearHighlights() {
        $reels.forEach(el => el.classList.remove('win-highlight'));
    }

    /* ================================================================
       STRIPS
       ================================================================ */
    function generateStrips() {
        reelStrips.standard = [buildReelStrip(STANDARD_COUNTS), buildReelStrip(STANDARD_COUNTS), buildReelStrip(STANDARD_COUNTS)];
        reelStrips.highRisk = [buildReelStrip(HIGHRISK_COUNTS), buildReelStrip(HIGHRISK_COUNTS), buildReelStrip(HIGHRISK_COUNTS)];
    }

    /* ================================================================
       SPIN
       ================================================================ */
    function spin() {
        const bet = parseInt($tokenInput.value) || 0;
        if (bet < 1 || bet > 1000) { showError('Bet must be 1 \u2013 1,000!'); return; }
        if (bet > balance) { showError('Not enough tokens!'); return; }
        if (isSpinning) return;

        isSpinning = true;
        $hitButton.disabled = true;
        hideError();
        clearHighlights();

        playSound('hit');
        playSound('spin');

        balance -= bet;
        totalWagered += bet;
        updateBalance(true);

        const tier = getRiskTier(bet);
        const strips = tier === 'high' ? reelStrips.highRisk : reelStrips.standard;

        for (let r = 0; r < 3; r++) {
            results[r] = strips[r][Math.floor(Math.random() * strips[r].length)];
        }

        for (let r = 0; r < 3; r++) {
            $reels[r].classList.remove('stopped', 'landing');
            $reels[r].classList.add('spinning');
            spinIntervals[r] = setInterval(() => setSlot(r, randomSymbol()), 60);
        }

        setTimeout(() => stopReel(0), 1200);
        setTimeout(() => stopReel(1), 2200);
        setTimeout(() => {
            stopReel(2);
            stopSound('spin');
            setTimeout(() => resolveResult(bet, tier), 350);
        }, 3200);
    }

    function stopReel(i) {
        clearInterval(spinIntervals[i]);
        spinIntervals[i] = null;
        setSlot(i, results[i]);
        $reels[i].classList.remove('spinning');
        $reels[i].classList.add('stopped', 'landing');
        setTimeout(() => $reels[i].classList.remove('landing'), 400);
    }

    /* ================================================================
       WIN DETECTION
       ================================================================ */
    function resolveResult(bet, tier) {
        const [s0, s1, s2] = results;
        const risk = RISK_MULTIPLIER[tier];
        let payout = 0;
        let winReels = [];

        if (DEBUG.forceJackpot || (s0 === 'trident' && s1 === 'trident' && s2 === 'trident')) {
            const won = jackpotPool;
            balance += won;
            totalWon += won;
            jackpotPool = DEFAULT_JACKPOT_SEED;
            winReels = [0, 1, 2];
            winReels.forEach(i => $reels[i].classList.add('win-highlight'));
            flashBalanceGold();
            isSpinning = false;
            $hitButton.disabled = false;
            updateJackpot();
            popJackpot();
            showJackpotWin(won);
            return;
        } else if (s0 === s1 && s1 === s2) {
            const sym = SYMBOLS[s0];
            payout = sym.value * 3 * sym.rarity * risk;
            winReels = [0, 1, 2];
        } else if (s0 === s1) {
            payout = SYMBOLS[s0].value * 2 * risk;
            winReels = [0, 1];
        } else if (s1 === s2) {
            payout = SYMBOLS[s1].value * 2 * risk;
            winReels = [1, 2];
        }

        payout = Math.floor(payout);

        if (payout > 0) {
            balance += payout;
            totalWon += payout;

            winReels.forEach(i => $reels[i].classList.add('win-highlight'));

            playSound('kaching');
            flashBalanceGold();
        } else {
            jackpotPool += bet;
            updateJackpot();
        }

        isSpinning = false;
        $hitButton.disabled = false;
    }

    /* ================================================================
       CASH OUT
       ================================================================ */
    function cashOut() {
        if (isSpinning) return;

        let overlay = document.querySelector('.cashout-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'cashout-overlay';
            overlay.innerHTML = `
                <div class="cashout-modal">
                    <h2>Cashing Out</h2>
                    <div class="cashout-stat">Final Balance: <strong id="co-balance">0</strong></div>
                    <div class="cashout-stat">Total Wagered: <strong id="co-wagered">0</strong></div>
                    <div class="cashout-stat">Total Won: <strong id="co-won">0</strong></div>
                    <button id="co-restart">Play Again</button>
                </div>
            `;
            document.body.appendChild(overlay);

            document.getElementById('co-restart').addEventListener('click', () => {
                overlay.classList.remove('show');
                balance = 1000;
                totalWagered = 0;
                totalWon = 0;
                jackpotPool = DEFAULT_JACKPOT_SEED;
                updateBalance(false);
                hideError();
                clearHighlights();
                updateJackpot();
                initReels();
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.remove('show');
            });
        }

        animateCount(document.getElementById('co-balance'), balance);
        animateCount(document.getElementById('co-wagered'), totalWagered);
        animateCount(document.getElementById('co-won'),     totalWon);
        overlay.classList.add('show');
    }

    /* ================================================================
       INIT
       ================================================================ */
    function initReels() {
        generateStrips();
        for (let r = 0; r < 3; r++) {
            results[r] = reelStrips.standard[r][Math.floor(Math.random() * 30)];
            setSlot(r, results[r]);
        }
    }

    /* ================================================================
       EVENTS
       ================================================================ */
    $hitButton.addEventListener('click', spin);

    $tokenInc.addEventListener('click', () => {
        let v = parseInt($tokenInput.value) || 0;
        $tokenInput.value = Math.min(v + 50, 1000);
        updateTierDisplay();
        updateJackpot();
    });

    $tokenDec.addEventListener('click', () => {
        let v = parseInt($tokenInput.value) || 0;
        $tokenInput.value = Math.max(v - 50, 1);
        updateTierDisplay();
        updateJackpot();
    });

    $tokenInput.addEventListener('input', () => {
        let v = parseInt($tokenInput.value);
        if (isNaN(v)) return;
        if (v > 1000) $tokenInput.value = 1000;
        if (v < 1) $tokenInput.value = 1;
        updateTierDisplay();
        updateJackpot();
    });

    $addTokens.addEventListener('click', () => {
        balance += 1000;
        updateBalance(true);
    });

    $cashOut.addEventListener('click', cashOut);

    /* ================================================================
       BACKGROUND BUBBLES
       ================================================================ */
    (function spawnBubbles() {
        const container = document.getElementById('bubble-bg');
        if (!container) return;

        function emit() {
            const b = document.createElement('div');
            b.className = 'jp-bubble';
            const size = 6 + Math.random() * 22;
            const duration = 7 + Math.random() * 12;
            const drift = (Math.random() - 0.5) * 120;
            b.style.cssText = `
                width:${size}px; height:${size}px;
                left:${Math.random() * 100}%;
                animation-duration:${duration}s;
                --drift:${drift}px;
                opacity:${0.25 + Math.random() * 0.45};
            `;
            container.appendChild(b);
            setTimeout(() => b.remove(), duration * 1000);
        }

        for (let i = 0; i < 18; i++) {
            setTimeout(emit, Math.random() * 8000);
        }
        setInterval(emit, 600);
    })();

    /* ================================================================
       BOOT
       ================================================================ */
    initReels();
    updateBalance(false);
    updateTierDisplay();
    updateJackpot();
})();
}

/* ====================================================================
   EXPORTS — picked up by Jest/Node, ignored by the browser
   ==================================================================== */
if (typeof module !== 'undefined' && module.exports) {
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
}
