// ======================================================
// INDICATORS
// EMA200 + SMA25 + KELTNER + STOCHASTIC + MACD
// ======================================================


// ======================================================
// SOURCE
// ======================================================

function getSource(candle) {
  // Pine:
  // src = input.source(low, "Source")

  return candle.low;
}


// ======================================================
// SMA
// ======================================================

function calculateSMA(values, length) {
  const result =
    new Array(values.length).fill(null);

  let sum = 0;

  for (
    let i = 0;
    i < values.length;
    i++
  ) {
    sum += values[i];

    if (i >= length) {
      sum -= values[i - length];
    }

    if (i >= length - 1) {
      result[i] =
        sum / length;
    }
  }

  return result;
}


// ======================================================
// EMA
// ======================================================

function calculateEMA(values, length) {
  const result =
    new Array(values.length).fill(null);

  if (
    values.length < length
  ) {
    return result;
  }

  // Pine's EMA starts from the SMA
  // of the first length values.

  let sum = 0;

  for (
    let i = 0;
    i < length;
    i++
  ) {
    sum += values[i];
  }

  result[length - 1] =
    sum / length;


  const multiplier =
    2 / (length + 1);


  for (
    let i = length;
    i < values.length;
    i++
  ) {
    result[i] =
      (
        values[i] -
        result[i - 1]
      ) *
        multiplier +
      result[i - 1];
  }

  return result;
}


// ======================================================
// TRUE RANGE
// ======================================================

function calculateTrueRange(
  candles
) {
  const result =
    new Array(
      candles.length
    ).fill(null);

  for (
    let i = 0;
    i < candles.length;
    i++
  ) {
    const candle =
      candles[i];

    if (i === 0) {
      result[i] =
        candle.high -
        candle.low;

      continue;
    }

    const previousClose =
      candles[i - 1].close;

    const range1 =
      candle.high -
      candle.low;

    const range2 =
      Math.abs(
        candle.high -
        previousClose
      );

    const range3 =
      Math.abs(
        candle.low -
        previousClose
      );

    result[i] =
      Math.max(
        range1,
        range2,
        range3
      );
  }

  return result;
}


// ======================================================
// ATR
// ======================================================

function calculateATR(
  candles,
  length
) {
  const trueRange =
    calculateTrueRange(
      candles
    );

  return calculateSMA(
    trueRange,
    length
  );
}


// ======================================================
// STOCHASTIC
// ======================================================

function calculateStochastic(
  candles,
  periodK,
  smoothK
) {
  const rawK =
    new Array(
      candles.length
    ).fill(null);


  // ----------------------------------------------
  // Raw %K
  // ----------------------------------------------

  for (
    let i = 0;
    i < candles.length;
    i++
  ) {
    if (
      i <
      periodK - 1
    ) {
      continue;
    }

    let highestHigh =
      -Infinity;

    let lowestLow =
      Infinity;


    for (
      let j =
        i - periodK + 1;
      j <= i;
      j++
    ) {
      highestHigh =
        Math.max(
          highestHigh,
          candles[j].high
        );

      lowestLow =
        Math.min(
          lowestLow,
          candles[j].low
        );
    }


    const range =
      highestHigh -
      lowestLow;


    if (range === 0) {
      rawK[i] = 0;
    } else {
      rawK[i] =
        (
          (
            candles[i].close -
            lowestLow
          ) /
          range
        ) *
        100;
    }
  }


  // ----------------------------------------------
  // SMA smoothing
  // ----------------------------------------------

  return calculateSMA(
    rawK,
    smoothK
  );
}


// ======================================================
// MACD
// ======================================================

function calculateMACD(
  source,
  fastLength,
  slowLength,
  signalLength
) {
  const fastMA =
    calculateEMA(
      source,
      fastLength
    );

  const slowMA =
    calculateEMA(
      source,
      slowLength
    );


  const macd =
    new Array(
      source.length
    ).fill(null);


  for (
    let i = 0;
    i < source.length;
    i++
  ) {
    if (
      fastMA[i] === null ||
      slowMA[i] === null
    ) {
      continue;
    }

    macd[i] =
      fastMA[i] -
      slowMA[i];
  }


  // We need the signal EMA
  // to ignore the initial null values.

  const signal =
    new Array(
      source.length
    ).fill(null);


  const validMACD =
    macd
      .map(
        (value, index) => ({
          value,
          index,
        })
      )
      .filter(
        (item) =>
          item.value !== null
      );


  if (
    validMACD.length >=
    signalLength
  ) {
    let sum = 0;

    for (
      let i = 0;
      i < signalLength;
      i++
    ) {
      sum +=
        validMACD[i].value;
    }

    const firstIndex =
      validMACD[
        signalLength - 1
      ].index;

    signal[firstIndex] =
      sum / signalLength;


    const multiplier =
      2 /
      (signalLength + 1);


    for (
      let i = signalLength;
      i < validMACD.length;
      i++
    ) {
      const current =
        validMACD[i];

      const previous =
        validMACD[i - 1];


      signal[current.index] =
        (
          current.value -
          signal[previous.index]
        ) *
          multiplier +
        signal[previous.index];
    }
  }


  // ----------------------------------------------
  // Histogram
  // ----------------------------------------------

  const histogram =
    new Array(
      source.length
    ).fill(null);


  for (
    let i = 0;
    i < source.length;
    i++
  ) {
    if (
      macd[i] === null ||
      signal[i] === null
    ) {
      continue;
    }

    histogram[i] =
      macd[i] -
      signal[i];
  }


  return {
    macd,
    signal,
    histogram,
  };
}


// ======================================================
// KELTNER CHANNEL
// ======================================================

function calculateKeltner(
  source,
  atr,
  length,
  multiplier
) {
  const ma =
    calculateSMA(
      source,
      length
    );


  const upper =
    new Array(
      source.length
    ).fill(null);

  const lower =
    new Array(
      source.length
    ).fill(null);


  for (
    let i = 0;
    i < source.length;
    i++
  ) {
    if (
      ma[i] === null ||
      atr[i] === null
    ) {
      continue;
    }

    upper[i] =
      ma[i] +
      atr[i] *
        multiplier;

    lower[i] =
      ma[i] -
      atr[i] *
        multiplier;
  }


  return {
    middle: ma,
    upper,
    lower,
  };
}


// ======================================================
// ALL INDICATORS
// ======================================================

function calculateIndicators(
  candles,
  settings
) {
  const source =
    candles.map(
      getSource
    );


  // SMA 25

  const sma =
    calculateSMA(
      source,
      settings.smaLength
    );


  // EMA 200

  const ema =
    calculateEMA(
      source,
      settings.emaLength
    );


  // ATR

  const atr =
    calculateATR(
      candles,
      settings.atrLength
    );


  // Keltner

  const keltner =
    calculateKeltner(
      source,
      atr,
      settings.keltnerLength,
      settings.keltnerMultiplier
    );


  // Stochastic

  const stochastic =
    calculateStochastic(
      candles,
      settings.stochasticLength,
      settings.stochasticSmooth
    );


  // MACD

  const macd =
    calculateMACD(
      source,

      settings.macdFast,

      settings.macdSlow,

      settings.macdSignal
    );


  return {
    source,

    sma,

    ema,

    atr,

    keltner,

    stochastic,

    macd,
  };
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getSource,
  calculateSMA,
  calculateEMA,
  calculateATR,
  calculateStochastic,
  calculateMACD,
  calculateKeltner,
  calculateIndicators,
};