# Slot Machine Research — Eric

---

### Weighted Symbol Tables

Real slot machines don't give each symbol an equal probability. Each symbol on each reel has an individual weight. For example:

| Symbol  | Weight (out of 100) |
| ------- | ------------------- |
| Cherry  | 30                  |
| Bar     | 25                  |
| Bell    | 20                  |
| Seven   | 15                  |
| Jackpot | 10                  |

For our game, we should define a configurable weight table per reel.

### Types of Paylines

- **Single payline:** Only the center row counts. Simple to implement, easy to understand.
- **Multi-payline:** Players can activate 5, 9, 20+ lines across rows and diagonals. Each active line costs additional bet.
- **Ways-to-win:** Any matching symbol in adjacent reels counts, no fixed lines. Much more complex logic.

For our project, starting with 3–5 fixed paylines (horizontal + diagonals) gives a good balance of complexity and playability without overcomplicating the algorithm.

### Win Detection Logic Pattern

Just some pseudocode:

```
for each active payline:
  collect the symbol at each reel for that line
  check if 3+ consecutive matching symbols exist from left to right
  if match: calculate payout = bet × symbol_multiplier
```

### Common Features

- **Session time display** — shows how long the player has been playing
- **Net loss/gain tracker** — always visible running total (not just current balance)
- **Spending limits** — let players set a max loss before the game soft-locks
- **Cool-down prompts** — after X spins, a "Take a break?" modal appears

### Why it matters for our project

Even though this is a fake-money game, including one or two of these features would:

1. Demonstrate thoughtful, user-centered design
2. Differentiate our game from just a addictive implementation
3. Give us something genuinely interesting to write about in the final report: ethical design

---

## Paytable & Information Architecture

Real slot machines always have a **paytable**
— a screen or panel that tells the player what each symbol combination pays out.

### Why it matters

- Players who don't understand what they're playing for disengage faster
- A well-designed paytable builds trust and makes the game feel legitimate
- It's also a natural place to show jackpot values, which drives aspirational play

### Paytable UX Patterns (from app research)

- Accessible via an `(i)` icon, not always visible — keeps the main UI clean (consistent with what Abhay noted about minimal main screen clutter)
- Usually a modal or slide-in panel
- Symbols shown large with their payout multipliers
