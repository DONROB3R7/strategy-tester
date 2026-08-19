// ======================================================
// BACKTEST ENGINE
// EMA + SMA + MACD + STOCHASTIC + KELTNER
//
// Uses strategy/strategy.js as the single strategy engine.
//
// Live model:
// - $3 margin
// - 10x leverage
// - $30 notional
// - $0.04 round-trip fee
// - Optional ATR TP
// - Optional ATR SL
// - Opposite signal reverses
// - No cooldown
// ======================================================

const {
  runStrategy,
} = require("./strategy/strategy");

// ======================================================
// BACKTEST
// ======================================================

function runBacktest(
  candles,
  userSettings = {}
) {
  if (
    !Array.isArray(candles) ||
    candles.length === 0
  ) {
    throw new Error(
      "No candles provided"
    );
  }

  const settings = {
    balance: 100,

    emaLength: 200,
    smaLength: 25,

    keltnerLength: 10,
    keltnerMultiplier: 2,

    atrLength: 15,

    stochasticLength: 10,
    stochasticSmoothing: 1,

    macdFast: 4,
    macdSlow: 34,
    macdSignal: 5,

    tpAtr: 15,

    // null = no SL
    slAtr: null,

    // Your live setup
    margin: 3,
    leverage: 10,

    // Fixed round-trip fee
    roundTripFee: 0.04,

    cooldownBars: 0,

    ...userSettings,
  };

  return runStrategy(
    candles,
    settings
  );
}

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  runBacktest,
};