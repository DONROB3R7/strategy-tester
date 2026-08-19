// ======================================================
// STRATEGY
// HLC3 + KAMA
// ======================================================


// ======================================================
// HLC3
// ======================================================

function calculateHLC3(candle) {
  return (
    candle.high +
    candle.low +
    candle.close
  ) / 3;
}


// ======================================================
// KAMA
// ======================================================

function calculateKAMA(
  candles,
  length = 200,
  fastLength = 2,
  slowLength = 30
) {
  const kama =
    new Array(candles.length).fill(null);

  if (candles.length === 0) {
    return kama;
  }

  const source = candles.map(
    (candle) =>
      calculateHLC3(candle)
  );

  const fastSC =
    2 / (fastLength + 1);

  const slowSC =
    2 / (slowLength + 1);


  for (
    let i = 0;
    i < candles.length;
    i++
  ) {
    // We need enough candles
    // to calculate the efficiency ratio.
    if (i < length) {
      continue;
    }


    // ==================================================
    // DIRECTION
    // ==================================================

    const direction =
      Math.abs(
        source[i] -
        source[i - length]
      );


    // ==================================================
    // VOLATILITY
    // ==================================================

    let volatility = 0;

    for (
      let j = i - length + 1;
      j <= i;
      j++
    ) {
      volatility += Math.abs(
        source[j] -
        source[j - 1]
      );
    }


    // ==================================================
    // EFFICIENCY RATIO
    // ==================================================

    const efficiencyRatio =
      volatility === 0
        ? 0
        : direction / volatility;


    // ==================================================
    // SMOOTHING CONSTANT
    // ==================================================

    const smoothingConstant =
      Math.pow(
        efficiencyRatio *
          (fastSC - slowSC) +
          slowSC,
        2
      );


    // ==================================================
    // FIRST KAMA VALUE
    // ==================================================

    if (
      kama[i - 1] === null
    ) {
      kama[i] = source[i];
    } else {
      kama[i] =
        kama[i - 1] +
        smoothingConstant *
          (
            source[i] -
            kama[i - 1]
          );
    }
  }


  return kama;
}


// ======================================================
// INDICATORS
// ======================================================

function calculateIndicators(
  candles,
  settings
) {
  return {
    kama: calculateKAMA(
      candles,

      settings.kamaLength,

      settings.kamaFast,

      settings.kamaSlow
    ),
  };
}


// ======================================================
// SIGNAL
// ======================================================
//
// Current temporary strategy:
//
// LONG:
// Previous close <= previous KAMA
// Current close > current KAMA
//
// SHORT:
// Previous close >= previous KAMA
// Current close < current KAMA
//
// This is our TEST strategy for the backtester.
// We can replace this later with your actual strategy.
// ======================================================

function getSignal(
  candles,
  index,
  indicators,
  settings
) {
  if (index < 1) {
    return null;
  }


  const candle =
    candles[index];

  const previousCandle =
    candles[index - 1];


  const kama =
    indicators.kama[index];

  const previousKama =
    indicators.kama[index - 1];


  // ==================================================
  // KAMA NOT READY
  // ==================================================

  if (
    kama === null ||
    previousKama === null
  ) {
    return null;
  }


  // ==================================================
  // LONG
  // ==================================================

  const crossedAbove =
    previousCandle.close <=
      previousKama &&
    candle.close > kama;


  if (crossedAbove) {
    const entry =
      candle.close;

    const stopLoss =
      candle.low;

    const riskDistance =
      entry - stopLoss;


    // Invalid trade
    if (
      riskDistance <= 0
    ) {
      return null;
    }


    return {
      direction: "LONG",

      entry,

      stopLoss,

      riskDistance,
    };
  }


  // ==================================================
  // SHORT
  // ==================================================

  const crossedBelow =
    previousCandle.close >=
      previousKama &&
    candle.close < kama;


  if (crossedBelow) {
    const entry =
      candle.close;

    const stopLoss =
      candle.high;

    const riskDistance =
      stopLoss - entry;


    // Invalid trade
    if (
      riskDistance <= 0
    ) {
      return null;
    }


    return {
      direction: "SHORT",

      entry,

      stopLoss,

      riskDistance,
    };
  }


  return null;
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  calculateHLC3,
  calculateKAMA,
  calculateIndicators,
  getSignal,
};