(function () {
    const jackpotText = document.getElementById('jackpot-text');
    const jackpotAmount = '5,000';
    let showingAmount = false;

    setInterval(() => {
        showingAmount = !showingAmount;
        jackpotText.textContent = showingAmount ? jackpotAmount : 'JACKPOT!!!';
    }, 1500);
})();
