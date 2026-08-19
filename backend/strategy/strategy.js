// ======================================================
// STRATEGY
// EMA200 + MACD + STOCHASTIC + KELTNER
// ======================================================


// ======================================================
// GET SIGNAL
// ======================================================

function getSignal(
  candles,
  index,
  indicators,
  settings,
  state
) {
  if (index < 1) {
    return null;
  }


  const candle =
    candles[index];


  // ==================================================
  // INDICATOR VALUES
  // ==================================================

  const close =
    candle.close;

  const sma =
    indicators.sma[index];

  const ema =
    indicators.ema[index];

  const upper =
    indicators.keltner.upper[index];

  const lower =
    indicators.keltner.lower[index];

  const k =
    indicators.stochastic[index];

  const hist =
    indicators.macd.histogram[index];

  const atr =
    indicators.atr[index];


  // ==================================================
  // WAIT UNTIL ALL INDICATORS ARE READY
  // ==================================================

  if (
    sma === null ||
    ema === null ||
    upper === null ||
    lower === null ||
    k === null ||
    hist === null ||
    atr === null
  ) {
    return null;
  }


  // ==================================================
  // LONG CONDITION
  // ==================================================
  //
  // Pine:
  //
  // close > out
  // and close < upper
  // and close > lower
  // and hist < 0
  // and k < 50
  // and close > out2
  //
  // ==================================================

  const longCondition =
    close > sma &&
    close < upper &&
    close > lower &&
    hist < 0 &&
    k < 50 &&
    close > ema;


  // ==================================================
  // SHORT CONDITION
  // ==================================================
  //
  // Pine:
  //
  // close < out
  // and close < upper
  // and close > lower
  // and hist > 0
  // and k > 50
  // and close < out2
  //
  // ==================================================

  const shortCondition =
    close < sma &&
    close < upper &&
    close > lower &&
    hist > 0 &&
    k > 50 &&
    close < ema;


  // ==================================================
  // DIRECTION MEMORY
  // ==================================================
  //
  // Pine:
  //
  // var int lastDirection = 0
  //
  // canLong =
  //     longCondition and lastDirection != 1
  //
  // canShort =
  //     shortCondition and lastDirection != -1
  //
  // ==================================================

  const canLong =
    longCondition &&
    state.lastDirection !== 1;


  const canShort =
    shortCondition &&
    state.lastDirection !== -1;


  // ==================================================
  // LONG
  // ==================================================

  if (canLong) {
    // Remember direction immediately,
    // exactly like the Pine script.

    state.lastDirection = 1;

    return {
      direction: "LONG",

      entry: close,

      atr,

      takeProfit:
        close +
        atr *
          settings.tpATRMultiplier,
    };
  }


  // ==================================================
  // SHORT
  // ==================================================

  if (canShort) {
    // Remember direction immediately,
    // exactly like the Pine script.

    state.lastDirection = -1;

    return {
      direction: "SHORT",

      entry: close,

      atr,

      takeProfit:
        close -
        atr *
          settings.tpATRMultiplier,
    };
  }


  return null;
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getSignal,
};