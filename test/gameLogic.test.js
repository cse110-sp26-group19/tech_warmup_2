const { calculatePayout } = require('../src/game/gameLogic');

test('calculatePayout multiplies correctly', () => {
  expect(calculatePayout(10, 2)).toBe(20);
});