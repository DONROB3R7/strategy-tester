// =============================================================================
// EMA + SMA + MACD + STOCHASTIC + KELTNER
// CommonJS strategy engine
//
// Supports optimizer parameters:
//
// EMA:                  150, 200, 300
// SMA:                  20, 25, 30
// Source:               open, high, low, close
// Keltner length:       10, 15, 20
// Keltner multiplier:   1, 2, 3
// ATR length:           10, 15, 20
// Stochastic smoothing: 1, 2, 3
// MACD Fast:             2, 4, 5, 6
// MACD Slow:             20, 34
// TP ATR:                5, 10, 15, 20
//
// No SL in current optimization.
// slAtr = null
//
// $3 margin
// 10x leverage
// $0.04 round-trip fee
// No cooldown
//
// IMPORTANT EXIT RULE:
//
// When TP or SL is hit:
//
// 1. Close the position.
// 2. Do NOT evaluate a new signal on the same candle.
// 3. Wait for the next candle.
// 4. The next candle may open a new position if a valid signal exists.
//
// Opposite signals while a position is open still reverse immediately.
// =============================================================================


// =============================================================================
// DEFAULT PARAMETERS
// =============================================================================

const DEFAULT_PARAMS = {
  balance: 100,

  // Moving averages
  emaLength: 200,
  smaLength: 25,

  // Source
  // "open", "high", "low", "close"
  source: "low",

  // Keltner
  keltnerLength: 10,
  keltnerMultiplier: 2,

  // ATR
  atrLength: 15,

  // Stochastic
  stochasticLength: 10,
  stochasticSmoothing: 1,

  // MACD
  macdFast: 4,
  macdSlow: 34,
  macdSignal: 5,

  // Take profit
  tpAtr: 15,

  // Stop loss
  // null = no stop loss
  slAtr: null,

  // Trading settings
  margin: 3,
  leverage: 10,

  // Fixed round-trip fee
  roundTripFee: 0.04,

  // Number of candles to wait after an exit
  // 0 = next candle is allowed
  cooldownBars: 0,
};


// =============================================================================
// HELPERS
// =============================================================================

function safeNumber(value, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}


// =============================================================================
// NORMALIZE CANDLES
// =============================================================================

function normalizeCandle(candle) {
  if (Array.isArray(candle)) {
    return {
      time: Number(candle[0]),
      open: Number(candle[1]),
      high: Number(candle[2]),
      low: Number(candle[3]),
      close: Number(candle[4]),
      volume: Number(candle[5] || 0),
    };
  }

  return {
    time: Number(
      candle.time ??
      candle.timestamp
    ),

    open: Number(candle.open),

    high: Number(candle.high),

    low: Number(candle.low),

    close: Number(candle.close),

    volume: Number(
      candle.volume || 0
    ),
  };
}


// =============================================================================
// SOURCE
// =============================================================================
//
// Supported:
//
// open
// high
// low
// close
//
// Default:
// low
// =============================================================================

function getSourceValues(candles, source) {
  const selectedSource =
    String(source || "low")
      .toLowerCase();

  return candles.map(candle => {
    switch (selectedSource) {

      case "open":
        return candle.open;

      case "high":
        return candle.high;

      case "low":
        return candle.low;

      case "close":
        return candle.close;

      default:
        return candle.low;
    }
  });
}


// =============================================================================
// SMA
// =============================================================================

function calculateSMA(values, length) {
  const result =
    new Array(values.length)
      .fill(null);

  if (length <= 0) {
    return result;
  }

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


// =============================================================================
// EMA
// =============================================================================

function calculateEMA(values, length) {
  const result =
    new Array(values.length)
      .fill(null);

  if (
    length <= 0 ||
    values.length < length
  ) {
    return result;
  }

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


// =============================================================================
// TRUE RANGE
// =============================================================================

function calculateTrueRange(candles) {
  const result =
    new Array(candles.length)
      .fill(null);

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

    result[i] =
      Math.max(

        candle.high -
        candle.low,

        Math.abs(
          candle.high -
          previousClose
        ),

        Math.abs(
          candle.low -
          previousClose
        )
      );
  }

  return result;
}


// =============================================================================
// ATR
// =============================================================================

function calculateATR(candles, length) {
  const trueRange =
    calculateTrueRange(candles);

  return calculateSMA(
    trueRange,
    length
  );
}


// =============================================================================
// STOCHASTIC
// =============================================================================
//
// Equivalent concept:
//
// ta.stoch(close, high, low, periodK)
//
// The configurable source does NOT affect Stochastic.
// Stochastic always uses:
//
// close
// high
// low
// =============================================================================

function calculateStochastic(
  candles,
  length,
  smoothing
) {

  const rawK =
    new Array(candles.length)
      .fill(null);

  for (
    let i = 0;
    i < candles.length;
    i++
  ) {

    if (
      i < length - 1
    ) {
      continue;
    }

    let highestHigh =
      -Infinity;

    let lowestLow =
      Infinity;

    for (
      let j =
        i - length + 1;
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

  if (
    smoothing <= 1
  ) {
    return rawK;
  }

  return calculateSMA(
    rawK,
    smoothing
  );
}


// =============================================================================
// MACD
// =============================================================================
//
// fast EMA
// slow EMA
// MACD = fast - slow
// signal = EMA(MACD)
// histogram = MACD - signal
//
// Uses configurable source.
// =============================================================================

function calculateMACD(
  source,
  fastLength,
  slowLength,
  signalLength
) {

  const fast =
    calculateEMA(
      source,
      fastLength
    );

  const slow =
    calculateEMA(
      source,
      slowLength
    );

  const macd =
    new Array(source.length)
      .fill(null);

  for (
    let i = 0;
    i < source.length;
    i++
  ) {

    if (
      fast[i] === null ||
      slow[i] === null
    ) {
      continue;
    }

    macd[i] =
      fast[i] -
      slow[i];
  }

  const signal =
    new Array(source.length)
      .fill(null);

  const valid = [];

  for (
    let i = 0;
    i < macd.length;
    i++
  ) {

    if (
      macd[i] !== null
    ) {

      valid.push({
        index: i,
        value: macd[i],
      });
    }
  }

  if (
    valid.length >=
    signalLength
  ) {

    let sum = 0;

    for (
      let i = 0;
      i < signalLength;
      i++
    ) {

      sum +=
        valid[i].value;
    }

    const first =
      valid[
        signalLength - 1
      ];

    signal[first.index] =
      sum / signalLength;

    const multiplier =
      2 /
      (signalLength + 1);

    for (
      let i = signalLength;
      i < valid.length;
      i++
    ) {

      const current =
        valid[i];

      const previous =
        valid[i - 1];

      signal[current.index] =
        (
          current.value -
          signal[previous.index]
        ) *
          multiplier +
        signal[previous.index];
    }
  }

  const histogram =
    new Array(source.length)
      .fill(null);

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


// =============================================================================
// INDICATORS
// =============================================================================

function calculateIndicators(
  candles,
  params
) {

  // ==================================================
  // SOURCE
  // ==================================================

  const source =
    getSourceValues(
      candles,
      params.source
    );


  // ==================================================
  // SMA
  // ==================================================

  const sma =
    calculateSMA(
      source,
      params.smaLength
    );


  // ==================================================
  // EMA
  // ==================================================

  const ema =
    calculateEMA(
      source,
      params.emaLength
    );


  // ==================================================
  // ATR
  // ==================================================

  const atr =
    calculateATR(
      candles,
      params.atrLength
    );


  // ==================================================
  // KELTNER MIDDLE
  // ==================================================

  const keltnerMiddle =
    calculateSMA(
      source,
      params.keltnerLength
    );


  const keltnerUpper =
    new Array(candles.length)
      .fill(null);


  const keltnerLower =
    new Array(candles.length)
      .fill(null);


  for (
    let i = 0;
    i < candles.length;
    i++
  ) {

    if (
      keltnerMiddle[i] === null ||
      atr[i] === null
    ) {
      continue;
    }

    keltnerUpper[i] =
      keltnerMiddle[i] +
      atr[i] *
        params.keltnerMultiplier;

    keltnerLower[i] =
      keltnerMiddle[i] -
      atr[i] *
        params.keltnerMultiplier;
  }


  // ==================================================
  // STOCHASTIC
  // ==================================================

  const stochastic =
    calculateStochastic(
      candles,
      params.stochasticLength,
      params.stochasticSmoothing
    );


  // ==================================================
  // MACD
  // ==================================================

  const macd =
    calculateMACD(
      source,
      params.macdFast,
      params.macdSlow,
      params.macdSignal
    );


  return {

    source,

    sma,

    ema,

    atr,

    keltnerMiddle,

    keltnerUpper,

    keltnerLower,

    stochastic,

    macd,
  };
}


// =============================================================================
// SIGNAL
// =============================================================================

function getSignal(
  candle,
  indicators,
  index,
  params
) {

  const {
    sma,
    ema,
    keltnerUpper,
    keltnerLower,
    stochastic,
    macd,
  } = indicators;


  if (
    sma[index] === null ||
    ema[index] === null ||
    keltnerUpper[index] === null ||
    keltnerLower[index] === null ||
    stochastic[index] === null ||
    macd.histogram[index] === null
  ) {

    return null;
  }


  const close =
    candle.close;

  const hist =
    macd.histogram[index];

  const k =
    stochastic[index];


  // ==================================================
  // LONG
  // ==================================================
  //
  // Price above SMA
  // Price below Keltner upper
  // Price above Keltner lower
  // MACD histogram negative
  // Stochastic below 50
  // Price above EMA
  // ==================================================

  const longCondition =
    close > sma[index] &&
    close < keltnerUpper[index] &&
    close > keltnerLower[index] &&
    hist < 0 &&
    k < 50 &&
    close > ema[index];


  // ==================================================
  // SHORT
  // ==================================================
  //
  // Price below SMA
  // Price below Keltner upper
  // Price above Keltner lower
  // MACD histogram positive
  // Stochastic above 50
  // Price below EMA
  // ==================================================

  const shortCondition =
    close < sma[index] &&
    close < keltnerUpper[index] &&
    close > keltnerLower[index] &&
    hist > 0 &&
    k > 50 &&
    close < ema[index];


  if (longCondition) {
    return "LONG";
  }


  if (shortCondition) {
    return "SHORT";
  }


  return null;
}


// =============================================================================
// PNL
// =============================================================================

function calculateGrossPnl(
  position,
  exitPrice
) {

  if (
    position.direction === "LONG"
  ) {

    return (
      (
        exitPrice -
        position.entryPrice
      ) *
      position.quantity
    );
  }


  return (
    (
      position.entryPrice -
      exitPrice
    ) *
    position.quantity
  );
}


// =============================================================================
// OPEN POSITION
// =============================================================================

function openPosition({
  direction,
  candle,
  atr,
  params,
  reason,
}) {

  const entryPrice =
    candle.close;


  // ==================================================
  // NOTIONAL
  // ==================================================

  const notional =
    params.margin *
    params.leverage;


  // ==================================================
  // QUANTITY
  // ==================================================

  const quantity =
    notional /
    entryPrice;


  let stopLoss = null;

  let takeProfit = null;


  // ==================================================
  // STOP LOSS
  // ==================================================

  if (
    params.slAtr !== null &&
    params.slAtr !== undefined &&
    Number(params.slAtr) > 0
  ) {

    if (
      direction === "LONG"
    ) {

      stopLoss =
        entryPrice -
        atr * params.slAtr;

    } else {

      stopLoss =
        entryPrice +
        atr * params.slAtr;
    }
  }


  // ==================================================
  // TAKE PROFIT
  // ==================================================

  if (
    params.tpAtr !== null &&
    params.tpAtr !== undefined &&
    Number(params.tpAtr) > 0
  ) {

    if (
      direction === "LONG"
    ) {

      takeProfit =
        entryPrice +
        atr * params.tpAtr;

    } else {

      takeProfit =
        entryPrice -
        atr * params.tpAtr;
    }
  }


  return {

    direction,

    entryTime:
      candle.time,

    entryIndex:
      candle.index,

    entryPrice,

    quantity,

    margin:
      params.margin,

    leverage:
      params.leverage,

    notional,

    atrAtEntry:
      atr,

    stopLoss,

    takeProfit,

    entryReason:
      reason,

    highestPrice:
      entryPrice,

    lowestPrice:
      entryPrice,
  };
}


// =============================================================================
// CLOSE POSITION
// =============================================================================

function closePosition({
  position,
  candle,
  exitPrice,
  reason,
  params,
}) {

  const grossPnl =
    calculateGrossPnl(
      position,
      exitPrice
    );


  const fee =
    Number(
      params.roundTripFee
    );


  const netPnl =
    grossPnl -
    fee;


  const returnOnMargin =
    position.margin === 0
      ? 0
      : (
          netPnl /
          position.margin
        ) *
        100;


  return {

    direction:
      position.direction,

    entryTime:
      position.entryTime,

    exitTime:
      candle.time,

    entryIndex:
      position.entryIndex,

    exitIndex:
      candle.index,

    entry:
      position.entryPrice,

    exit:
      exitPrice,

    quantity:
      position.quantity,

    margin:
      position.margin,

    leverage:
      position.leverage,

    notional:
      position.notional,

    stopLoss:
      position.stopLoss,

    takeProfit:
      position.takeProfit,

    atrAtEntry:
      position.atrAtEntry,

    result:
      netPnl > 0
        ? "WIN"
        : netPnl < 0
          ? "LOSS"
          : "BREAKEVEN",

    exitReason:
      reason,

    grossPnl,

    fee,

    pnl:
      netPnl,

    returnOnMargin,
  };
}


// =============================================================================
// INTRABAR TP / SL
// =============================================================================
//
// IMPORTANT:
//
// If both TP and SL are inside the same candle, OHLC data cannot tell us
// which level was actually hit first.
//
// Current conservative assumption:
//
// BOTH HIT -> STOP LOSS wins.
//
// This avoids giving the backtest the benefit of the doubt.
// =============================================================================

function checkIntrabarExit(
  position,
  candle
) {

  // ==================================================
  // LONG
  // ==================================================

  if (
    position.direction === "LONG"
  ) {

    const hitSL =
      position.stopLoss !== null &&
      candle.low <=
        position.stopLoss;


    const hitTP =
      position.takeProfit !== null &&
      candle.high >=
        position.takeProfit;


    // ----------------------------------------------
    // BOTH HIT
    // ----------------------------------------------

    if (
      hitSL &&
      hitTP
    ) {

      return {
        price:
          position.stopLoss,

        reason:
          "STOP_LOSS",
      };
    }


    // ----------------------------------------------
    // SL HIT
    // ----------------------------------------------

    if (hitSL) {

      return {
        price:
          position.stopLoss,

        reason:
          "STOP_LOSS",
      };
    }


    // ----------------------------------------------
    // TP HIT
    // ----------------------------------------------

    if (hitTP) {

      return {
        price:
          position.takeProfit,

        reason:
          "TAKE_PROFIT",
      };
    }
  }


  // ==================================================
  // SHORT
  // ==================================================

  if (
    position.direction === "SHORT"
  ) {

    const hitSL =
      position.stopLoss !== null &&
      candle.high >=
        position.stopLoss;


    const hitTP =
      position.takeProfit !== null &&
      candle.low <=
        position.takeProfit;


    // ----------------------------------------------
    // BOTH HIT
    // ----------------------------------------------

    if (
      hitSL &&
      hitTP
    ) {

      return {
        price:
          position.stopLoss,

        reason:
          "STOP_LOSS",
      };
    }


    // ----------------------------------------------
    // SL HIT
    // ----------------------------------------------

    if (hitSL) {

      return {
        price:
          position.stopLoss,

        reason:
          "STOP_LOSS",
      };
    }


    // ----------------------------------------------
    // TP HIT
    // ----------------------------------------------

    if (hitTP) {

      return {
        price:
          position.takeProfit,

        reason:
          "TAKE_PROFIT",
      };
    }
  }


  return null;
}


// =============================================================================
// MAIN STRATEGY
// =============================================================================

function runStrategy(
  rawCandles,
  userParams = {}
) {

  // ==================================================
  // PARAMETERS
  // ==================================================

  const params = {
    ...DEFAULT_PARAMS,
    ...userParams,
  };


  // ==================================================
  // NORMALIZE CANDLES
  // ==================================================

  const candles =
    rawCandles

      .map(
        normalizeCandle
      )

      .filter(
        candle =>
          Number.isFinite(
            candle.time
          ) &&

          Number.isFinite(
            candle.open
          ) &&

          Number.isFinite(
            candle.high
          ) &&

          Number.isFinite(
            candle.low
          ) &&

          Number.isFinite(
            candle.close
          )
      )

      .map(
        (candle, index) => ({
          ...candle,
          index,
        })
      );


  if (
    candles.length === 0
  ) {

    throw new Error(
      "No valid candles."
    );
  }


  // ==================================================
  // CALCULATE INDICATORS
  // ==================================================

  const indicators =
    calculateIndicators(
      candles,
      params
    );


  // ==================================================
  // BALANCE
  // ==================================================

  let balance =
    safeNumber(
      params.balance,
      100
    );


  const startingBalance =
    balance;


  // ==================================================
  // POSITION
  // ==================================================

  let position = null;


  // ==================================================
  // LAST EXIT
  // ==================================================

  let lastExitIndex =
    -Infinity;


  // ==================================================
  // TRADE STORAGE
  // ==================================================

  const trades = [];


  // ==================================================
  // EQUITY CURVE
  // ==================================================

  const equityCurve = [];


  // ==================================================
  // DRAWDOWN
  // ==================================================

  let peakEquity =
    startingBalance;


  let maxDrawdown =
    0;


  // ==================================================
  // MAIN CANDLE LOOP
  // ==================================================

  for (
    let i = 0;
    i < candles.length;
    i++
  ) {

    const candle =
      candles[i];


    // ==================================================
    // UPDATE EXISTING POSITION
    // ==================================================

    if (position) {

      position.highestPrice =
        Math.max(
          position.highestPrice,
          candle.high
        );


      position.lowestPrice =
        Math.min(
          position.lowestPrice,
          candle.low
        );


      // ------------------------------------------------
      // CHECK TP / SL
      // ------------------------------------------------

      const exit =
        checkIntrabarExit(
          position,
          candle
        );


      if (exit) {

        const trade =
          closePosition({
            position,

            candle,

            exitPrice:
              exit.price,

            reason:
              exit.reason,

            params,
          });


        balance +=
          trade.pnl;


        trades.push(
          trade
        );


        position = null;


        lastExitIndex =
          i;


        // ==================================================
        // IMPORTANT:
        //
        // TP/SL CLOSED THE POSITION ON THIS CANDLE.
        //
        // DO NOT LOOK FOR A NEW SIGNAL ON THIS SAME CANDLE.
        //
        // "WAIT FOR NEXT SIGNAL" MEANS THE NEXT CANDLE
        // MUST BE USED FOR THE NEXT POSSIBLE ENTRY.
        //
        // cooldownBars = 0:
        //     next candle is allowed.
        //
        // ==================================================

        continue;
      }
    }


    // ==================================================
    // SIGNAL
    // ==================================================

    const signal =
      getSignal(
        candle,
        indicators,
        i,
        params
      );


    // ==================================================
    // NO POSITION
    // ==================================================

    if (
      !position &&
      signal
    ) {

      const barsSinceExit =
        i -
        lastExitIndex;


      // ------------------------------------------------
      // cooldownBars = 0
      //
      // After an exit on candle 100:
      //
      // candle 100 -> blocked because of "continue"
      // candle 101 -> allowed
      //
      // cooldownBars = 1:
      //
      // candle 100 -> blocked
      // candle 101 -> blocked
      // candle 102 -> allowed
      // ------------------------------------------------

      if (
        barsSinceExit >
        Number(
          params.cooldownBars
        )
      ) {

        const atr =
          indicators.atr[i];


        if (
          Number.isFinite(atr)
        ) {

          position =
            openPosition({
              direction:
                signal,

              candle,

              atr,

              params,

              reason:
                "SIGNAL",
            });
        }
      }
    }


    // ==================================================
    // OPPOSITE SIGNAL
    // ==================================================
    //
    // This is different from TP/SL.
    //
    // If an opposite signal appears while a position
    // is still open, we close and reverse immediately.
    //
    // ==================================================

    else if (
      position &&
      signal &&
      signal !==
        position.direction
    ) {

      const trade =
        closePosition({
          position,

          candle,

          exitPrice:
            candle.close,

          reason:
            "REVERSE_SIGNAL",

          params,
        });


      balance +=
        trade.pnl;


      trades.push(
        trade
      );


      position = null;


      lastExitIndex =
        i;


      // ------------------------------------------------
      // OPEN OPPOSITE POSITION
      // ------------------------------------------------

      const atr =
        indicators.atr[i];


      if (
        Number.isFinite(atr)
      ) {

        position =
          openPosition({
            direction:
              signal,

            candle,

            atr,

            params,

            reason:
              "REVERSE_SIGNAL",
          });
      }
    }


    // ==================================================
    // EQUITY
    // ==================================================

    let equity =
      balance;


    if (position) {

      equity +=
        calculateGrossPnl(
          position,
          candle.close
        );
    }


    equityCurve.push({

      time:
        candle.time,

      balance:
        equity,
    });


    // ==================================================
    // PEAK EQUITY
    // ==================================================

    peakEquity =
      Math.max(
        peakEquity,
        equity
      );


    // ==================================================
    // DRAWDOWN
    // ==================================================

    const drawdown =
      peakEquity === 0
        ? 0
        : (
            (
              peakEquity -
              equity
            ) /
            peakEquity
          ) *
          100;


    maxDrawdown =
      Math.max(
        maxDrawdown,
        drawdown
      );
  }


  // ==================================================
  // FINAL OPEN POSITION
  // ==================================================

  const finalPosition =
    position
      ? {

          direction:
            position.direction,

          entryTime:
            position.entryTime,

          entryPrice:
            position.entryPrice,

          currentPrice:
            candles[
              candles.length - 1
            ].close,

          unrealizedPnl:
            calculateGrossPnl(
              position,
              candles[
                candles.length - 1
              ].close
            ),
        }

      : null;


  position = null;


  // ==================================================
  // STATISTICS
  // ==================================================

  const winners =
    trades.filter(
      trade =>
        trade.pnl > 0
    );


  const losers =
    trades.filter(
      trade =>
        trade.pnl < 0
    );


  const breakeven =
    trades.filter(
      trade =>
        trade.pnl === 0
    );


  // ==================================================
  // GROSS PROFIT
  // ==================================================

  const grossProfit =
    winners.reduce(
      (sum, trade) =>
        sum +
        trade.pnl,
      0
    );


  // ==================================================
  // GROSS LOSS
  // ==================================================

  const grossLoss =
    losers.reduce(
      (sum, trade) =>
        sum +
        Math.abs(
          trade.pnl
        ),
      0
    );


  // ==================================================
  // NET PROFIT
  // ==================================================

  const netProfit =
    balance -
    startingBalance;


  // ==================================================
  // WIN RATE
  // ==================================================

  const winRate =
    trades.length === 0
      ? 0
      : (
          winners.length /
          trades.length
        ) *
        100;


  // ==================================================
  // PROFIT FACTOR
  // ==================================================

  const profitFactor =
    grossLoss === 0
      ? grossProfit > 0
        ? Infinity
        : 0
      : grossProfit /
        grossLoss;


  // ==================================================
  // RETURN %
  // ==================================================

  const returnPercent =
    startingBalance === 0
      ? 0
      : (
          netProfit /
          startingBalance
        ) *
        100;


  // ==================================================
  // AVERAGE TRADE
  // ==================================================

  const averageTrade =
    trades.length === 0
      ? 0
      : netProfit /
        trades.length;


  // ==================================================
  // RESULT
  // ==================================================

  return {

    startingBalance,

    endingBalance:
      balance,

    netProfit,

    returnPercent,

    totalTrades:
      trades.length,

    winners:
      winners.length,

    losers:
      losers.length,

    breakeven:
      breakeven.length,

    winRate,

    grossProfit,

    grossLoss,

    profitFactor,

    averageTrade,

    maxDrawdown,

    maxDrawdownPercent:
      maxDrawdown,

    candles:
      candles.length,

    parameters:
      params,

    trades,

    equityCurve,

    finalPosition,
  };
}


// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  DEFAULT_PARAMS,

  runStrategy,

  getSignal,

  calculateIndicators,
};

