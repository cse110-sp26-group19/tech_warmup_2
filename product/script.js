(function () {
    'use strict';

    /* ================================================================
       SYMBOLS — value is base payout, rarity is bonus for triples
       ================================================================ */
    const SYMBOLS = {
        coral:     { name: "Tidecaller's Sapphire", icon: 'assets/icons/blue-jewel-icon-removebg-preview.png',  value: 50,  rarity: 1 },
        pearl:     { name: "Siren's Emerald",       icon: 'assets/icons/green-jewel-icon-removebg-preview.png', value: 75,  rarity: 1.5 },
        temple:    { name: 'Heart of the Abyss',    icon: 'assets/icons/pink-jewel-icon-removebg-preview.png',  value: 125, rarity: 2 },
        leviathan: { name: 'The Sea King',           icon: 'assets/icons/poseidon-icon-removebg-preview.png',    value: 200, rarity: 3 },
        crown:     { name: 'Crown of Atlantis',      icon: 'assets/icons/crown-icon-removebg-preview.png',       value: 400, rarity: 5 },
        trident:   { name: "Poseidon's Trident",     icon: 'assets/icons/trident-icon-removebg-preview.png',     value: 750, rarity: 10 },
    };

    const SYMBOL_KEYS = Object.keys(SYMBOLS);

    /* ================================================================
       REEL STRIPS
       ================================================================ */
    const STANDARD_COUNTS = { coral: 7, pearl: 7, temple: 6, leviathan: 5, crown: 3, trident: 2 };
    const HIGHRISK_COUNTS = { coral: 9, pearl: 7, temple: 6, leviathan: 5, crown: 1, trident: 2 };

    function buildReelStrip(counts) {
        const strip = [];
        for (const [sym, count] of Object.entries(counts)) {
            for (let i = 0; i < count; i++) strip.push(sym);
        }
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
       HELPERS
       ================================================================ */
    function fmt(n) { return Math.floor(n).toLocaleString('en-US'); }

    function getRiskTier(bet) {
        if (bet <= 250) return 'low';
        if (bet <= 750) return 'medium';
        return 'high';
    }

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
    function updateBalance(animate) {
        $balanceAmount.textContent = fmt(balance);
        if (animate) {
            $balanceAmount.classList.remove('bump', 'win-flash');
            void $balanceAmount.offsetWidth;
            $balanceAmount.classList.add('bump');
        }
    }

    function flashBalanceGold() {
        $balanceAmount.textContent = fmt(balance);
        $balanceAmount.classList.remove('bump', 'win-flash');
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

    function updateJackpot() {
        const str = fmt(jackpotPool);

        let showNumber = false;
        clearInterval(window._jpInterval);
        window._jpInterval = setInterval(() => {
            showNumber = !showNumber;
            rippleJackpot(showNumber ? str : 'JACKPOT!!!');
        }, 2500);
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

        balance -= bet;
        totalWagered += bet;
        updateBalance(false);

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

        if (s0 === s1 && s1 === s2) {
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
                jackpotPool = 69420420;
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

        document.getElementById('co-balance').textContent = fmt(balance);
        document.getElementById('co-wagered').textContent = fmt(totalWagered);
        document.getElementById('co-won').textContent = fmt(totalWon);
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
       BOOT
       ================================================================ */
    initReels();
    updateBalance(false);
    updateTierDisplay();
    updateJackpot();
})();
