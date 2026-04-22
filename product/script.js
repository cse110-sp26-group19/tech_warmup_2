(function () {
    'use strict';

    /* ================================================================
       SYMBOLS — value is base payout, rarity is bonus for triples
       ================================================================ */
    const SYMBOLS = {
        coral:     { name: "Tidecaller's Sapphire", icon: 'assets/icons/blue-gem.png',  value: 50,  rarity: 1 },
        pearl:     { name: "Siren's Emerald",       icon: 'assets/icons/green-gem.png', value: 75,  rarity: 1.5 },
        temple:    { name: 'Heart of the Abyss',    icon: 'assets/icons/pink-gem.png',  value: 125, rarity: 2 },
        leviathan: { name: 'The Sea King',           icon: 'assets/icons/poseidon.png',  value: 200, rarity: 3 },
        crown:     { name: 'Crown of Atlantis',      icon: 'assets/icons/crown.png',     value: 400, rarity: 5 },
        trident:   { name: "Poseidon's Trident",     icon: 'assets/icons/trident.png',   value: 750, rarity: 10 },
    };

    const SYMBOL_KEYS = Object.keys(SYMBOLS);

    /* ================================================================
       REEL STRIPS
       ================================================================ */
    const STANDARD_COUNTS = { coral: 7, pearl: 7, temple: 6, leviathan: 5, crown: 3, trident: 2 };
    const HIGHRISK_COUNTS = { coral: 9, pearl: 7, temple: 6, leviathan: 5, crown: 1, trident: 2 };

    /**
     * Builds a shuffled reel strip from a symbol frequency map.
     * @param {Object} counts - Map of symbol key → number of appearances on the strip.
     * @returns {string[]} Shuffled array of symbol keys.
     */
    function buildReelStrip(counts) {
        const strip = [];
        for (const [sym, count] of Object.entries(counts)) {
            for (let i = 0; i < count; i++) strip.push(sym);
        }
        // Fisher-Yates shuffle
        for (let i = strip.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [strip[i], strip[j]] = [strip[j], strip[i]];
        }
        return strip;
    }

    /* ================================================================
       RISK
       ================================================================ */
    const RISK_MULTIPLIER = { low: 1, medium: 2, high: 4 };

    /* ================================================================
       STATE
       ================================================================ */
    let balance = 1000;
    let totalWagered = 0;
    let totalWon = 0;
    let jackpotPool = 69420420;
    let isSpinning = false;

    const DEBUG = { forceJackpot: false }; // toggle to false to disable

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

    /** Starts background music on the first user interaction (required by browser autoplay policy). */
    function unlockAudio() {
        if (audioUnlocked) return;
        audioUnlocked = true;
        SFX.music.play().catch(() => {});
    }
    document.addEventListener('click', unlockAudio, { once: true });

    /**
     * Plays a sound from the SFX map, restarting it if already playing.
     * @param {string} key - Key from the SFX object (e.g. 'spin', 'kaching').
     */
    function playSound(key) {
        if (!audioUnlocked) return;
        const s = SFX[key];
        s.currentTime = 0;
        s.play().catch(() => {});
    }

    /**
     * Pauses a sound and resets its position.
     * @param {string} key - Key from the SFX object.
     */
    function stopSound(key) {
        const s = SFX[key];
        s.pause();
        s.currentTime = 0;
    }

    /* ================================================================
       HELPERS
       ================================================================ */
    /** Formats a number as a locale string with no decimals (e.g. 12345 → "12,345"). */
    function fmt(n) { return Math.floor(n).toLocaleString('en-US'); }

    /**
     * Removes near-white pixels from an image using a canvas, returning a transparent-background data URL.
     * Used to clean the jackpot banner image before displaying it.
     * @param {string} src - Image URL to process.
     * @param {number} [threshold=235] - RGB channel value above which a pixel is treated as white.
     * @returns {Promise<string>} Data URL of the processed image.
     */
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

    // Pre-process the jackpot banner to remove its white background
    let jackpotImgSrc = 'assets/icons/jackpot-banner.png';
    stripWhite(jackpotImgSrc).then(url => { jackpotImgSrc = url; });

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

    /** Returns a random symbol key from SYMBOLS (uniform distribution, used during spin animation). */
    function randomSymbol() {
        return SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)];
    }

    /**
     * Updates a reel's visible image to the given symbol.
     * @param {number} i - Reel index (0–2).
     * @param {string} key - Symbol key from SYMBOLS.
     */
    function setSlot(i, key) {
        $slotImgs[i].src = SYMBOLS[key].icon;
        $slotImgs[i].alt = SYMBOLS[key].name;
    }

    /* ================================================================
       UI UPDATES
       ================================================================ */
    // Tracks the balance value the counter started from, used to interpolate animations
    let _balFrom = 0;
    let _balRaf = null;

    /**
     * Updates the displayed balance. When animated, smoothly counts from the previous value to the new one.
     * @param {boolean} animate - If true, animate the count; if false, update instantly.
     */
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
        // Duration scales with the delta so large jumps don't feel instant, capped at 900ms
        const duration = Math.min(900, 120 + Math.abs(to - from) * 0.4);
        const start = performance.now();
        if (_balRaf) cancelAnimationFrame(_balRaf);

        $balanceAmount.dataset.dir = rising ? 'up' : 'down';

        function tick(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
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

    /** Animates the balance counter and triggers the gold win-flash CSS animation. */
    function flashBalanceGold() {
        updateBalance(true);
        $balanceAmount.classList.remove('win-flash');
        void $balanceAmount.offsetWidth; // force reflow to restart the animation
        $balanceAmount.classList.add('win-flash');
    }

    /** Updates the SPIN button style and highlights the active risk card based on the current bet. */
    function updateTierDisplay() {
        const bet = parseInt($tokenInput.value) || 0;
        const tier = getRiskTier(bet);

        $hitButton.className = `risk-${tier}`;

        document.querySelectorAll('.risk-card').forEach(p => p.classList.remove('active'));
        if (tier === 'low')    document.getElementById('low-risk-card').classList.add('active');
        if (tier === 'medium') document.getElementById('mid-risk-card').classList.add('active');
        if (tier === 'high')   document.getElementById('high-risk-card').classList.add('active');
    }

    /**
     * Shows the full-screen jackpot win overlay with coin rain, bubbles, and a counting payout display.
     * @param {number} amount - The jackpot amount won.
     */
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

        // coin rain
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

        // generate bubbles
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

        // ka-ching bursts timed with coin rain
        const kachingTimes = [300, 700, 1100, 1600, 2200, 2900];
        kachingTimes.forEach(t => setTimeout(() => playSound('kaching'), t));

        // start counter after label fades in
        setTimeout(() => {
            animateCount(document.getElementById('jpw-amount'), amount, 1800);
        }, 1000);

        overlay.querySelector('.jackpot-win-close').addEventListener('click', () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 400);
        });
    }

    /** Starts the jackpot ticker, alternating between the current pool value and "JACKPOT!!!" every 2.5s. */
    function updateJackpot() {
        const str = fmt(jackpotPool);

        let showNumber = false;
        clearInterval(window._jpInterval);
        window._jpInterval = setInterval(() => {
            showNumber = !showNumber;
            rippleJackpot(showNumber ? str : 'JACKPOT!!!');
        }, 2500);
    }

    /** Triggers the CSS pop/scale animation on the jackpot display. */
    function popJackpot() {
        $jackpotText.classList.remove('popping');
        void $jackpotText.offsetWidth; // force reflow to restart the animation
        $jackpotText.classList.add('popping');
    }

    /**
     * Animates a number counting up from 0 to a target value inside a DOM element.
     * @param {HTMLElement} el - Element whose text content will be updated.
     * @param {number} to - Target value to count up to.
     * @param {number} [duration=1200] - Animation duration in milliseconds.
     */
    function animateCount(el, to, duration = 1200) {
        const start = performance.now();
        el.classList.remove('counting');
        void el.offsetWidth; // force reflow to restart the animation
        el.classList.add('counting');
        function tick(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
            el.textContent = fmt(to * eased);
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = fmt(to);
        }
        requestAnimationFrame(tick);
    }

    /**
     * Transitions the jackpot display to new text with a ripple animation.
     * Text is swapped mid-animation so it appears to "wash in".
     * @param {string} newText - The text to display after the ripple.
     */
    function rippleJackpot(newText) {
        $jackpotText.classList.add('rippling');

        setTimeout(() => {
            $jackpotText.textContent = newText;
        }, 350);

        setTimeout(() => {
            $jackpotText.classList.remove('rippling');
        }, 750);
    }

    /**
     * Displays an error message in the result banner.
     * @param {string} text - Message to show.
     */
    function showError(text) {
        $resultBanner.className = 'result-banner show';
        $resultText.textContent = text;
    }

    /** Hides the result/error banner. */
    function hideError() { $resultBanner.className = 'result-banner'; }

    /** Removes the win-highlight CSS class from all three reels. */
    function clearHighlights() {
        $reels.forEach(el => el.classList.remove('win-highlight'));
    }

    /* ================================================================
       STRIPS
       ================================================================ */
    /** Generates fresh shuffled reel strips for both standard and high-risk modes. */
    function generateStrips() {
        reelStrips.standard = [buildReelStrip(STANDARD_COUNTS), buildReelStrip(STANDARD_COUNTS), buildReelStrip(STANDARD_COUNTS)];
        reelStrips.highRisk = [buildReelStrip(HIGHRISK_COUNTS), buildReelStrip(HIGHRISK_COUNTS), buildReelStrip(HIGHRISK_COUNTS)];
    }

    /* ================================================================
       SPIN
       ================================================================ */
    /**
     * Handles a spin attempt: validates the bet, deducts it, animates the reels,
     * and schedules each reel to stop with a staggered delay before resolving the result.
     */
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
        // High-risk bets use a strip with fewer crown symbols for a lower jackpot hit chance
        const strips = tier === 'high' ? reelStrips.highRisk : reelStrips.standard;

        // Pre-determine the outcome before the animation starts
        for (let r = 0; r < 3; r++) {
            results[r] = strips[r][Math.floor(Math.random() * strips[r].length)];
        }

        // Start all three reels cycling through random symbols at 60ms intervals
        for (let r = 0; r < 3; r++) {
            $reels[r].classList.remove('stopped', 'landing');
            $reels[r].classList.add('spinning');
            spinIntervals[r] = setInterval(() => setSlot(r, randomSymbol()), 60);
        }

        // Stop reels left-to-right with 1s gaps between each
        setTimeout(() => stopReel(0), 1200);
        setTimeout(() => stopReel(1), 2200);
        setTimeout(() => {
            stopReel(2);
            stopSound('spin');
            setTimeout(() => resolveResult(bet, tier), 350);
        }, 3200);
    }

    /**
     * Stops a single reel, snaps it to the pre-determined result symbol, and plays the landing animation.
     * @param {number} i - Reel index (0–2).
     */
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
    /**
     * Evaluates the spin outcome and applies the payout (or feeds the jackpot pool on a loss).
     *
     * Payout rules:
     *   - Three tridents → jackpot (entire pool)
     *   - Three of a kind → value × 3 × rarity × risk multiplier
     *   - Two of a kind (reels 0+1 or 1+2) → value × 2 × risk multiplier
     *   - No match → bet is added to the jackpot pool
     *
     * @param {number} bet  - The amount wagered this spin.
     * @param {string} tier - Risk tier: 'low', 'medium', or 'high'.
     */
    function resolveResult(bet, tier) {
        const [s0, s1, s2] = results;
        const risk = RISK_MULTIPLIER[tier];
        let payout = 0;
        let winReels = [];

        if (DEBUG.forceJackpot || (s0 === 'trident' && s1 === 'trident' && s2 === 'trident')) {
            const won = jackpotPool;
            balance += won;
            totalWon += won;
            jackpotPool = 69420420; // reset pool to default seed value
            winReels = [0, 1, 2];
            winReels.forEach(i => $reels[i].classList.add('win-highlight'));
            flashBalanceGold();
            isSpinning = false;
            $hitButton.disabled = false;
            updateJackpot();
            // add popJackpot to show the jackpot win lint showed function wasnt being used / called - mig
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
            // No win — losing bets feed the jackpot pool
            jackpotPool += bet;
            updateJackpot();
        }

        isSpinning = false;
        $hitButton.disabled = false;
    }

    /* ================================================================
       CASH OUT
       ================================================================ */
    /**
     * Displays the cash-out summary modal with animated final stats.
     * The modal is created once and reused on subsequent calls.
     * "Play Again" resets all state back to defaults.
     */
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
                jackpotPool = 69420420;
                updateBalance(false);
                hideError();
                clearHighlights();
                updateJackpot();
                initReels();
            });

            // Clicking the backdrop closes the modal
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
    /** Generates reel strips and sets each reel to a random starting symbol. */
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

    // +/- buttons step the bet by 50, clamped to 1–1000
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

    // Clamp manual input to valid bet range
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
    /**
     * IIFE that continuously emits floating bubble elements into the background container.
     * Each bubble is randomly sized, positioned, and given a horizontal drift via a CSS variable.
     * Bubbles remove themselves from the DOM when their animation completes.
     */
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

        // Stagger an initial burst of bubbles across the first 8 seconds
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
