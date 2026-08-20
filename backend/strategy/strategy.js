// =============================================================================
// PINE-MATCHED STRATEGY ENGINE
//
// Matches:
//
// EMA200 MACD + Stochastic BOT V1.3
//
// Pine behavior:
//
// - Source selectable: open/high/low/close
// - SMA filter
// - EMA filter
// - Keltner filter
// - Stochastic filter
// - MACD filter
// - Direction memory
// - Direction reset after position close
// - Static ATR captured on signal
// - TP / SL based on captured ATR
// - $100 cash position size
// - $0.04 commission per order
// - No pyramiding
// - Signal generated on candle close
// - Entry executes on NEXT candle open
//
// IMPORTANT:
//
// TradingView's historical broker emulator has detailed intrabar
// assumptions that cannot be perfectly reconstructed from OHLC alone.
//
// When both TP and SL are touched in the same candle, this engine
// uses the conservative assumption that SL is hit first.
//
// =============================================================================


// =============================================================================
// DEFAULT PARAMETERS
// =============================================================================

const DEFAULT_PARAMS = {

  // ---------------------------------------------------------------------------
  // ACCOUNT / POSITION
  // ---------------------------------------------------------------------------

  balance: 100,

  // Pine:
  //
  // default_qty_type=strategy.cash
  // default_qty_value=100
  //
  orderValue: 100,

  // Pine:
  //
  // commission_type=strategy.commission.cash_per_order
  // commission_value=0.04

  commissionPerOrder: 0.04,


  // ---------------------------------------------------------------------------
  // SOURCE
  // ---------------------------------------------------------------------------

  source: "low",


  // ---------------------------------------------------------------------------
  // MOVING AVERAGES
  // ---------------------------------------------------------------------------

  smaLength: 25,

  emaLength: 200,


  // ---------------------------------------------------------------------------
  // KELTNER
  // ---------------------------------------------------------------------------

  keltnerLength: 10,

  keltnerMultiplier: 2,

  atrLength: 15,


  // ---------------------------------------------------------------------------
  // STOCHASTIC
  // ---------------------------------------------------------------------------

  stochasticLength: 10,

  stochasticSmoothing: 1,


  // ---------------------------------------------------------------------------
  // MACD
  // ---------------------------------------------------------------------------

  macdFast: 4,

  macdSlow: 34,

  macdSignal: 5,


  // ---------------------------------------------------------------------------
  // TP / SL
  // ---------------------------------------------------------------------------

  tpAtr: 15,

  slAtr: 3,


  // ---------------------------------------------------------------------------
  // FILTER SWITCHES
  // ---------------------------------------------------------------------------

  useSMA: true,

  useEMA: true,

  useKC: true,

  useStoch: true,

  useMACD: true,


  // ---------------------------------------------------------------------------
  // COMPATIBILITY
  // ---------------------------------------------------------------------------

  margin: 3,

  leverage: 10,

  roundTripFee: 0.04,

  cooldownBars: 0,

};


// =============================================================================
// NUMBER HELPERS
// =============================================================================

function safeNumber(
  value,
  fallback = 0
) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


// =============================================================================
// CANDLE NORMALIZATION
// =============================================================================

function normalizeCandle(
  candle
) {

  if (
    Array.isArray(candle)
  ) {

    return {

      time:
        Number(candle[0]),

      open:
        Number(candle[1]),

      high:
        Number(candle[2]),

      low:
        Number(candle[3]),

      close:
        Number(candle[4]),

      volume:
        Number(candle[5] || 0),

    };

  }


  return {

    time:
      Number(
        candle.time ??
        candle.timestamp
      ),

    open:
      Number(candle.open),

    high:
      Number(candle.high),

    low:
      Number(candle.low),

    close:
      Number(candle.close),

    volume:
      Number(
        candle.volume || 0
      ),

  };

}


// =============================================================================
// SOURCE
// =============================================================================

function getSourceValues(
  candles,
  source
) {

  const selected =
    String(
      source || "low"
    ).toLowerCase();


  return candles.map(
    candle => {

      switch (
        selected
      ) {

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

    }
  );

}


// =============================================================================
// SMA
// =============================================================================

function calculateSMA(
  values,
  length
) {

  const result =
    new Array(
      values.length
    ).fill(null);


  const period =
    Math.max(
      1,
      Math.floor(
        Number(length)
      )
    );


  if (
    values.length <
    period
  ) {

    return result;

  }


  let sum = 0;

  let validCount = 0;


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    const value =
      values[i];


    if (
      value !== null &&
      value !== undefined &&
      Number.isFinite(
        Number(value)
      )
    ) {

      sum +=
        Number(value);

      validCount++;

    }


    if (
      i >= period
    ) {

      const old =
        values[
          i - period
        ];

      if (
        old !== null &&
        old !== undefined &&
        Number.isFinite(
          Number(old)
        )
      ) {

        sum -=
          Number(old);

        validCount--;

      }

    }


    if (
      i >= period - 1 &&
      validCount === period
    ) {

      result[i] =
        sum / period;

    }

  }


  return result;

}


// =============================================================================
// EMA
// =============================================================================
//
// TradingView-style EMA initialization is approximated using an SMA seed.
//
// =============================================================================

function calculateEMA(
  values,
  length
) {

  const result =
    new Array(
      values.length
    ).fill(null);


  const period =
    Math.max(
      1,
      Math.floor(
        Number(length)
      )
    );


  if (
    values.length <
    period
  ) {

    return result;

  }


  let sum = 0;


  for (
    let i = 0;
    i < period;
    i++
  ) {

    if (
      !Number.isFinite(
        Number(values[i])
      )
    ) {

      return result;

    }

    sum +=
      Number(values[i]);

  }


  result[
    period - 1
  ] =
    sum / period;


  const multiplier =
    2 /
    (
      period + 1
    );


  for (
    let i = period;
    i < values.length;
    i++
  ) {

    result[i] =

      (
        Number(values[i]) -
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


    if (
      i === 0
    ) {

      result[i] =
        candle.high -
        candle.low;

      continue;

    }


    const previousClose =
      candles[
        i - 1
      ].close;


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
// RMA / WILDER SMOOTHING
// =============================================================================
//
// Pine:
// ta.rma()
// ta.atr()
//
// RMA:
// first value = SMA(period)
// next values:
//
// RMA =
// (previous RMA * (period - 1) + current) / period
//
// =============================================================================

function calculateRMA(
  values,
  length
) {

  const result =
    new Array(
      values.length
    ).fill(null);


  const period =
    Math.max(
      1,
      Math.floor(
        Number(length)
      )
    );


  if (
    values.length <
    period
  ) {

    return result;

  }


  let sum = 0;


  for (
    let i = 0;
    i < period;
    i++
  ) {

    if (
      !Number.isFinite(
        Number(values[i])
      )
    ) {

      return result;

    }


    sum +=
      Number(values[i]);

  }


  result[
    period - 1
  ] =
    sum / period;


  for (
    let i = period;
    i < values.length;
    i++
  ) {

    result[i] =

      (
        result[i - 1] *
        (period - 1) +

        Number(values[i])
      ) /

      period;

  }


  return result;

}


// =============================================================================
// ATR
// =============================================================================
//
// Pine:
//
// atr = ta.atr(atrlength)
//
// ta.atr() = RMA(True Range)
//
// =============================================================================

function calculateATR(
  candles,
  length
) {

  const trueRange =
    calculateTrueRange(
      candles
    );


  return calculateRMA(
    trueRange,
    length
  );

}


// =============================================================================
// STOCHASTIC
// =============================================================================
//
// Pine:
//
// ta.stoch(close, high, low, periodK)
//
// then:
//
// ta.sma(rawK, smoothK)
//
// =============================================================================

function calculateStochastic(
  candles,
  length,
  smoothing
) {

  const period =
    Math.max(
      1,
      Math.floor(
        Number(length)
      )
    );


  const smooth =
    Math.max(
      1,
      Math.floor(
        Number(smoothing)
      )
    );


  const rawK =
    new Array(
      candles.length
    ).fill(null);


  for (
    let i = 0;
    i < candles.length;
    i++
  ) {

    if (
      i <
      period - 1
    ) {

      continue;

    }


    let highestHigh =
      -Infinity;


    let lowestLow =
      Infinity;


    for (
      let j =
        i - period + 1;

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


    if (
      range === 0
    ) {

      rawK[i] =
        0;

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
    smooth <= 1
  ) {

    return rawK;

  }


  return calculateSMA(
    rawK,
    smooth
  );

}


// =============================================================================
// MACD
// =============================================================================
//
// Pine:
//
// fast_ma = ta.ema(src, fast_length)
// slow_ma = ta.ema(src, slow_length)
//
// macd = fast_ma - slow_ma
//
// signal = ta.ema(macd, signal_length)
//
// hist = macd - signal
//
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
    new Array(
      source.length
    ).fill(null);


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


  // -----------------------------------------------------
  // Signal EMA over valid MACD values
  // -----------------------------------------------------

  const signal =
    new Array(
      source.length
    ).fill(null);


  const validValues = [];

  const validIndexes = [];


  for (
    let i = 0;
    i < macd.length;
    i++
  ) {

    if (
      macd[i] !== null
    ) {

      validValues.push(
        macd[i]
      );

      validIndexes.push(
        i
      );

    }

  }


  if (
    validValues.length >=
    Number(signalLength)
  ) {

    const validSignal =
      calculateEMA(
        validValues,
        signalLength
      );


    for (
      let i = 0;
      i < validSignal.length;
      i++
    ) {

      if (
        validSignal[i] !== null
      ) {

        signal[
          validIndexes[i]
        ] =
          validSignal[i];

      }

    }

  }


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


// =============================================================================
// INDICATORS
// =============================================================================

function calculateIndicators(
  candles,
  params
) {

  // ====================================================
  // SOURCE
  // ====================================================

  const source =
    getSourceValues(
      candles,
      params.source
    );


  // ====================================================
  // SMA
  // ====================================================

  const sma =
    calculateSMA(
      source,
      params.smaLength
    );


  // ====================================================
  // EMA
  // ====================================================

  const ema =
    calculateEMA(
      source,
      params.emaLength
    );


  // ====================================================
  // ATR
  // ====================================================

  const atr =
    calculateATR(
      candles,
      params.atrLength
    );


  // ====================================================
  // KELTNER
  // ====================================================

  const keltnerMiddle =
    calculateSMA(
      source,
      params.keltnerLength
    );


  const keltnerUpper =
    new Array(
      candles.length
    ).fill(null);


  const keltnerLower =
    new Array(
      candles.length
    ).fill(null);


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
      Number(
        params.keltnerMultiplier
      );


    keltnerLower[i] =

      keltnerMiddle[i] -

      atr[i] *
      Number(
        params.keltnerMultiplier
      );

  }


  // ====================================================
  // STOCHASTIC
  // ====================================================

  const stochastic =
    calculateStochastic(
      candles,

      params.stochasticLength,

      params.stochasticSmoothing

    );


  // ====================================================
  // MACD
  // ====================================================

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
//
// This reproduces:
//
// longCondition =
//      (not useSMA or smaLongFilter) and
//      (not useEMA or emaLongFilter) and
//      (not useKC or kcLongFilter) and
//      (not useStoch or stochLongFilter) and
//      (not useMACD or macdLongFilter)
//
// shortCondition =
//      ...
//
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

  } =
    indicators;


  // ====================================================
  // INDICATOR AVAILABILITY
  // ====================================================

  if (
    params.useSMA &&
    sma[index] === null
  ) {

    return null;

  }


  if (
    params.useEMA &&
    ema[index] === null
  ) {

    return null;

  }


  if (
    params.useKC &&
    (
      keltnerUpper[index] === null ||
      keltnerLower[index] === null
    )
  ) {

    return null;

  }


  if (
    params.useStoch &&
    stochastic[index] === null
  ) {

    return null;

  }


  if (
    params.useMACD &&
    macd.histogram[index] === null
  ) {

    return null;

  }


  const close =
    candle.close;


  // ====================================================
  // SMA
  // ====================================================

  const smaLongFilter =
    !params.useSMA ||
    close >
      sma[index];


  const smaShortFilter =
    !params.useSMA ||
    close <
      sma[index];


  // ====================================================
  // EMA
  // ====================================================

  const emaLongFilter =
    !params.useEMA ||
    close >
      ema[index];


  const emaShortFilter =
    !params.useEMA ||
    close <
      ema[index];


  // ====================================================
  // KELTNER
  // ====================================================

  const kcLongFilter =
    !params.useKC ||

    (
      close <
        keltnerUpper[index] &&

      close >
        keltnerLower[index]
    );


  const kcShortFilter =
    !params.useKC ||

    (
      close <
        keltnerUpper[index] &&

      close >
        keltnerLower[index]
    );


  // ====================================================
  // STOCHASTIC
  // ====================================================

  const k =
    stochastic[index];


  const stochLongFilter =
    !params.useStoch ||
    k < 50;


  const stochShortFilter =
    !params.useStoch ||
    k > 50;


  // ====================================================
  // MACD
  // ====================================================

  const histogram =
    macd.histogram[index];


  const macdLongFilter =
    !params.useMACD ||
    histogram < 0;


  const macdShortFilter =
    !params.useMACD ||
    histogram > 0;


  // ====================================================
  // LONG
  // ====================================================

  const longCondition =

    smaLongFilter &&

    emaLongFilter &&

    kcLongFilter &&

    stochLongFilter &&

    macdLongFilter;


  // ====================================================
  // SHORT
  // ====================================================

  const shortCondition =

    smaShortFilter &&

    emaShortFilter &&

    kcShortFilter &&

    stochShortFilter &&

    macdShortFilter;


  if (
    longCondition
  ) {

    return "LONG";

  }


  if (
    shortCondition
  ) {

    return "SHORT";

  }


  return null;

}


// =============================================================================
// POSITION SIZE
// =============================================================================
//
// Pine:
//
// default_qty_type = strategy.cash
// default_qty_value = 100
//
// quantity = 100 / entry price
//
// =============================================================================

function calculateQuantity(
  entryPrice,
  params
) {

  const orderValue =
    safeNumber(
      params.orderValue,
      100
    );


  if (
    entryPrice <= 0
  ) {

    return 0;

  }


  return (
    orderValue /
    entryPrice
  );

}


// =============================================================================
// OPEN POSITION
// =============================================================================

function createPosition({
  direction,
  entryPrice,
  signalIndex,
  entryIndex,
  signalATR,
  params,
  reason,
}) {

  const quantity =
    calculateQuantity(
      entryPrice,
      params
    );


  const atr =
    signalATR;


  let takeProfit =
    null;


  let stopLoss =
    null;


  // ====================================================
  // TP
  // ====================================================

  if (
    Number.isFinite(atr) &&
    Number(
      params.tpAtr
    ) > 0
  ) {

    if (
      direction === "LONG"
    ) {

      takeProfit =
        entryPrice +
        atr *
          Number(
            params.tpAtr
          );

    } else {

      takeProfit =
        entryPrice -
        atr *
          Number(
            params.tpAtr
          );

    }

  }


  // ====================================================
  // SL
  // ====================================================

  if (
    Number.isFinite(atr) &&
    params.slAtr !== null &&
    params.slAtr !== undefined &&
    Number(
      params.slAtr
    ) > 0
  ) {

    if (
      direction === "LONG"
    ) {

      stopLoss =
        entryPrice -
        atr *
          Number(
            params.slAtr
          );

    } else {

      stopLoss =
        entryPrice +
        atr *
          Number(
            params.slAtr
          );

    }

  }


  return {

    direction,

    signalIndex,

    entryIndex,

    entryTime:
      null,

    entryPrice,

    quantity,

    notional:
      quantity *
      entryPrice,

    atrAtEntry:
      atr,

    takeProfit,

    stopLoss,

    entryReason:
      reason,

  };

}


// =============================================================================
// TRADE EXIT
// =============================================================================

function buildClosedTrade({
  position,
  exitPrice,
  exitIndex,
  exitTime,
  exitReason,
  commission,
}) {

  const grossPnl =

    position.direction === "LONG"

      ? (
          exitPrice -
          position.entryPrice
        ) *
        position.quantity

      : (
          position.entryPrice -
          exitPrice
        ) *
        position.quantity;


  const netPnl =
    grossPnl -
    commission;


  return {

    direction:
      position.direction,

    entryIndex:
      position.entryIndex,

    exitIndex,

    entryTime:
      position.entryTime,

    exitTime,

    entry:
      position.entryPrice,

    exit:
      exitPrice,

    quantity:
      position.quantity,

    notional:
      position.notional,

    atrAtEntry:
      position.atrAtEntry,

    takeProfit:
      position.takeProfit,

    stopLoss:
      position.stopLoss,

    exitReason,

    grossPnl,

    fee:
      commission,

    pnl:
      netPnl,

    result:
      netPnl > 0
        ? "WIN"
        : netPnl < 0
          ? "LOSS"
          : "BREAKEVEN",

  };

}


// =============================================================================
// CHECK TP / SL
// =============================================================================
//
// OHLC alone cannot tell which level was hit first if both are inside
// the same candle.
//
// Conservative rule:
//
// BOTH HIT -> SL
//
// =============================================================================

function checkExit(
  position,
  candle
) {

  if (
    position.direction === "LONG"
  ) {

    const slHit =
      position.stopLoss !== null &&
      candle.low <=
        position.stopLoss;


    const tpHit =
      position.takeProfit !== null &&
      candle.high >=
        position.takeProfit;


    if (
      slHit &&
      tpHit
    ) {

      return {

        price:
          position.stopLoss,

        reason:
          "STOP_LOSS",

      };

    }


    if (
      slHit
    ) {

      return {

        price:
          position.stopLoss,

        reason:
          "STOP_LOSS",

      };

    }


    if (
      tpHit
    ) {

      return {

        price:
          position.takeProfit,

        reason:
          "TAKE_PROFIT",

      };

    }

  }


  if (
    position.direction === "SHORT"
  ) {

    const slHit =
      position.stopLoss !== null &&
      candle.high >=
        position.stopLoss;


    const tpHit =
      position.takeProfit !== null &&
      candle.low <=
        position.takeProfit;


    if (
      slHit &&
      tpHit
    ) {

      return {

        price:
          position.stopLoss,

        reason:
          "STOP_LOSS",

      };

    }


    if (
      slHit
    ) {

      return {

        price:
          position.stopLoss,

        reason:
          "STOP_LOSS",

      };

    }


    if (
      tpHit
    ) {

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

  // ====================================================
  // PARAMETERS
  // ====================================================

  const params = {

    ...DEFAULT_PARAMS,

    ...userParams,

  };


  // ====================================================
  // NORMALIZE
  // ====================================================

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
        (
          candle,
          index
        ) => ({

          ...candle,

          index,

        })
      );


  if (
    candles.length === 0
  ) {

    throw new Error(
      "No valid candles provided."
    );

  }


  // ====================================================
  // INDICATORS
  // ====================================================

  const indicators =
    calculateIndicators(
      candles,
      params
    );


  // ====================================================
  // ACCOUNT
  // ====================================================

  let balance =
    safeNumber(
      params.balance,
      100
    );


  const startingBalance =
    balance;


  // ====================================================
  // POSITION
  // ====================================================

  let position =
    null;


  // ====================================================
  // DIRECTION MEMORY
  // ====================================================
  //
  // 0  = none
  // 1  = last signal was LONG
  // -1 = last signal was SHORT
  //
  // IMPORTANT:
  //
  // Reset to 0 after position closes.
  //
  // Matches your new Pine version.
  //
  // ====================================================

  let lastDirection =
    0;


  // ====================================================
  // PENDING ORDER
  // ====================================================
  //
  // Pine strategy.entry() is generated on the signal bar
  // and fills on the next available bar by default.
  //
  // We therefore store the signal and execute it at the
  // next candle OPEN.
  //
  // ====================================================

  let pendingOrder =
    null;


  // ====================================================
  // PREVENT SAME-CANDLE REENTRY AFTER EXIT
  // ====================================================

  let blockedEntryIndex =
    -1;


  // ====================================================
  // COOLDOWN
  // ====================================================

  let lastExitIndex =
    -Infinity;


  // ====================================================
  // TRADES
  // ====================================================

  const trades =
    [];


  // ====================================================
  // EQUITY
  // ====================================================

  const equityCurve =
    [];


  let peakEquity =
    startingBalance;


  let maxDrawdown =
    0;


  // ====================================================
  // MAIN LOOP
  // ====================================================

  for (
    let i = 0;
    i < candles.length;
    i++
  ) {

    const candle =
      candles[i];


    // ==================================================
    // 1. EXECUTE PENDING ORDER AT CURRENT OPEN
    // ==================================================

    if (
      pendingOrder &&
      pendingOrder.executeIndex === i
    ) {

      const order =
        pendingOrder;


      pendingOrder =
        null;


      // ------------------------------------------------
      // POSITION EXISTS
      // ------------------------------------------------

      if (
        position
      ) {

        // ----------------------------------------------
        // SAME DIRECTION
        // ----------------------------------------------

        if (
          position.direction ===
          order.direction
        ) {

          // Nothing to do.

        }

        // ----------------------------------------------
        // REVERSAL
        // ----------------------------------------------

        else {

          // TradingView's opposite strategy.entry()
          // reverses the position at the next available
          // execution price.
          //
          // Treat the reversal as one new order.
          //
          // One commission is charged for this order.

          const reversalFee =
            safeNumber(
              params.commissionPerOrder,
              0.04
            );


          const closedTrade =
            buildClosedTrade({

              position,

              exitPrice:
                candle.open,

              exitIndex:
                i,

              exitTime:
                candle.time,

              exitReason:
                "REVERSE_SIGNAL",

              commission:
                reversalFee,

            });


          balance +=
            closedTrade.pnl;


          trades.push(
            closedTrade
          );


          const newPosition =
            createPosition({

              direction:
                order.direction,

              entryPrice:
                candle.open,

              signalIndex:
                order.signalIndex,

              entryIndex:
                i,

              signalATR:
                order.atr,

              params,

              reason:
                "REVERSE_SIGNAL",

            });


          // The reversal order already paid
          // one commission above.
          //
          // Store it as part of the new position
          // so future reporting remains clear.

          newPosition.entryTime =
            candle.time;


          newPosition.entryFee =
            0;


          position =
            newPosition;


          // IMPORTANT:
          //
          // Direction memory changes to the
          // new direction immediately.

          lastDirection =
            order.direction ===
            "LONG"
              ? 1
              : -1;

        }

      }

      // ------------------------------------------------
      // NO POSITION
      // ------------------------------------------------

      else {

        const entryFee =
          safeNumber(
            params.commissionPerOrder,
            0.04
          );


        // Entry commission is paid immediately.
        balance -=
          entryFee;


        const newPosition =
          createPosition({

            direction:
              order.direction,

            entryPrice:
              candle.open,

            signalIndex:
              order.signalIndex,

            entryIndex:
              i,

            signalATR:
              order.atr,

            params,

            reason:
              "SIGNAL",

          });


        newPosition.entryTime =
          candle.time;


        newPosition.entryFee =
          entryFee;


        position =
          newPosition;

      }

    }


    // ==================================================
    // 2. CHECK TP / SL
    // ==================================================
    //
    // This occurs after a pending order has filled.
    //
    // Therefore a position can technically hit TP/SL on
    // its entry candle if the bar range crosses a level.
    //
    // ==================================================

    let closedThisCandle =
      false;


    if (
      position
    ) {

      const exit =
        checkExit(
          position,
          candle
        );


      if (
        exit
      ) {

        const exitFee =
          safeNumber(
            params.commissionPerOrder,
            0.04
          );


        const trade =
          buildClosedTrade({

            position,

            exitPrice:
              exit.price,

            exitIndex:
              i,

            exitTime:
              candle.time,

            exitReason:
              exit.reason,

            commission:
              exitFee,

          });


        balance +=
          trade.pnl;


        trades.push(
          trade
        );


        position =
          null;


        lastExitIndex =
          i;


        blockedEntryIndex =
          i;


        // ==================================================
        // NEW PINE BEHAVIOR
        //
        // Reset direction after TP/SL.
        // ==================================================

        lastDirection =
          0;


        closedThisCandle =
          true;

      }

    }


    // ==================================================
    // 3. SIGNAL
    // ==================================================
    //
    // Never generate another entry on the same candle
    // where TP/SL just closed a position.
    //
    // ==================================================

    if (
      !closedThisCandle
    ) {

      const signal =
        getSignal(
          candle,
          indicators,
          i,
          params
        );


      if (
        signal
      ) {

        // --------------------------------------------
        // DIRECTION MEMORY
        // --------------------------------------------

        const directionAllowed =

          signal === "LONG"

            ? lastDirection !== 1

            : lastDirection !== -1;


        // --------------------------------------------
        // CHECK COOLDOWN
        // --------------------------------------------

        const barsSinceExit =
          i -
          lastExitIndex;


        const cooldownAllowed =
          barsSinceExit >
          Number(
            params.cooldownBars || 0
          );


        // --------------------------------------------
        // CHECK WHETHER ORDER ALREADY PENDING
        // --------------------------------------------

        const orderPending =
          Boolean(
            pendingOrder
          );


        if (
          directionAllowed &&
          cooldownAllowed &&
          !orderPending
        ) {

          const atr =
            indicators.atr[i];


          if (
            Number.isFinite(
              atr
            )
          ) {

            // ------------------------------------------
            // SAVE DIRECTION MEMORY IMMEDIATELY
            //
            // This matches Pine:
            //
            // lastDirection := 1
            //
            // on the signal bar.
            // ------------------------------------------

            lastDirection =
              signal === "LONG"
                ? 1
                : -1;


            // ------------------------------------------
            // SAVE PENDING ORDER
            // ------------------------------------------

            pendingOrder = {

              direction:
                signal,

              signalIndex:
                i,

              executeIndex:
                i + 1,

              signalTime:
                candle.time,

              atr,

            };

          }

        }

      }

    }


    // ==================================================
    // 4. EQUITY
    // ==================================================

    let equity =
      balance;


    if (
      position
    ) {

      const unrealized =
        position.direction === "LONG"

          ? (
              candle.close -
              position.entryPrice
            ) *
            position.quantity

          : (
              position.entryPrice -
              candle.close
            ) *
            position.quantity;


      equity +=
        unrealized;

    }


    equityCurve.push({

      time:
        candle.time,

      balance:
        equity,

    });


    // ==================================================
    // 5. PEAK
    // ==================================================

    peakEquity =
      Math.max(
        peakEquity,
        equity
      );


    // ==================================================
    // 6. DRAWDOWN
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


  // ====================================================
  // CLOSE FINAL OPEN POSITION FOR REPORTING
  // ====================================================
  //
  // TradingView leaves an open trade open at the end
  // unless explicitly closed.
  //
  // Therefore we DO NOT add this unrealized P&L to
  // realized netProfit.
  //
  // ====================================================

  const finalCandle =
    candles[
      candles.length - 1
    ];


  let finalPosition =
    null;


  if (
    position
  ) {

    const unrealizedPnl =

      position.direction === "LONG"

        ? (
            finalCandle.close -
            position.entryPrice
          ) *
          position.quantity

        : (
            position.entryPrice -
            finalCandle.close
          ) *
          position.quantity;


    finalPosition = {

      direction:
        position.direction,

      entryTime:
        position.entryTime,

      entryPrice:
        position.entryPrice,

      currentPrice:
        finalCandle.close,

      unrealizedPnl,

      quantity:
        position.quantity,

    };

  }


  // ====================================================
  // STATISTICS
  // ====================================================

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


  // ====================================================
  // GROSS PROFIT
  // ====================================================

  const grossProfit =
    winners.reduce(
      (
        sum,
        trade
      ) =>
        sum +
        trade.pnl,
      0
    );


  // ====================================================
  // GROSS LOSS
  // ====================================================

  const grossLoss =
    losers.reduce(
      (
        sum,
        trade
      ) =>
        sum +
        Math.abs(
          trade.pnl
        ),
      0
    );


  // ====================================================
  // REALIZED NET PROFIT
  // ====================================================

  const netProfit =
    balance -
    startingBalance;


  // ====================================================
  // WIN RATE
  // ====================================================

  const winRate =
    trades.length === 0

      ? 0

      : (
          winners.length /
          trades.length
        ) *
        100;


  // ====================================================
  // PROFIT FACTOR
  // ====================================================

  const profitFactor =

    grossLoss === 0

      ? (
          grossProfit > 0
            ? Infinity
            : 0
        )

      : grossProfit /
        grossLoss;


  // ====================================================
  // RETURN
  // ====================================================

  const returnPercent =

    startingBalance === 0

      ? 0

      : (
          netProfit /
          startingBalance
        ) *
        100;


  // ====================================================
  // AVERAGE TRADE
  // ====================================================

  const averageTrade =
    trades.length === 0

      ? 0

      : netProfit /
        trades.length;


  // ====================================================
  // RESULT
  // ====================================================

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

