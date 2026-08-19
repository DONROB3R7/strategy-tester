// ======================================================
// BACKTEST ENGINE
// EMA200 + MACD + STOCHASTIC + KELTNER
//
// Rules:
// - No stop loss
// - ATR-based take profit
// - Opposite signal reverses the position
// - TP can be hit by an intrabar spike
// - Cooldown applies after TP
// ======================================================

const {
  calculateIndicators,
} = require("./strategy/indicators");

const {
  getSignal,
} = require("./strategy/strategy");


// ======================================================
// DEFAULT SETTINGS
// ======================================================

const DEFAULT_SETTINGS = {
  balance: 100,

  positionSize: 100,

  cooldown: 0,

  smaLength: 25,

  emaLength: 200,

  keltnerLength: 10,

  keltnerMultiplier: 2,

  atrLength: 15,

  stochasticLength: 10,

  stochasticSmooth: 1,

  macdFast: 4,

  macdSlow: 34,

  macdSignal: 5,

  tpATRMultiplier: 15,
};


// ======================================================
// BACKTEST
// ======================================================

function runBacktest(
  candles,
  userSettings = {}
) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...userSettings,
  };

  if (
    !Array.isArray(candles) ||
    candles.length === 0
  ) {
    throw new Error(
      "No candles provided"
    );
  }


  // ==================================================
  // INDICATORS
  // ==================================================

  const indicators =
    calculateIndicators(
      candles,
      settings
    );


  // ==================================================
  // STATE
  // ==================================================

  let balance =
    Number(settings.balance);

  const startingBalance =
    balance;

  let position = null;

  let cooldownRemaining = 0;

  const strategyState = {
    lastDirection: 0,
  };

  const trades = [];


  // ==================================================
  // CANDLE LOOP
  // ==================================================

  for (
    let i = 0;
    i < candles.length;
    i++
  ) {
    const candle =
      candles[i];


    // ==================================================
    // COOLDOWN
    // ==================================================

    if (
      cooldownRemaining > 0
    ) {
      cooldownRemaining--;
    }


    // ==================================================
    // MANAGE EXISTING POSITION
    // ==================================================

    if (position) {
      let tpHit = false;

      // ----------------------------------------------
      // LONG TP
      // ----------------------------------------------

      if (
        position.direction === "LONG" &&
        candle.high >=
          position.takeProfit
      ) {
        tpHit = true;
      }


      // ----------------------------------------------
      // SHORT TP
      // ----------------------------------------------

      if (
        position.direction === "SHORT" &&
        candle.low <=
          position.takeProfit
      ) {
        tpHit = true;
      }


      // ----------------------------------------------
      // TP EXIT
      // ----------------------------------------------

      if (tpHit) {
        const exitPrice =
          position.takeProfit;

        let pnl;


        if (
          position.direction === "LONG"
        ) {
          pnl =
            (
              exitPrice -
              position.entry
            ) *
            position.quantity;
        } else {
          pnl =
            (
              position.entry -
              exitPrice
            ) *
            position.quantity;
        }


        balance += pnl;


        trades.push({
          direction:
            position.direction,

          entryTime:
            position.entryTime,

          exitTime:
            candle.time,

          entry:
            position.entry,

          exit:
            exitPrice,

          stopLoss:
            null,

          takeProfit:
            position.takeProfit,

          result:
            pnl >= 0
              ? "WIN"
              : "LOSS",

          pnl,

          exitReason:
            "TP",
        });


        position = null;


        // Cooldown starts only
        // after TP.

        cooldownRemaining =
          Number(settings.cooldown);

        continue;
      }
    }


    // ==================================================
    // NO POSITION
    // ==================================================

    if (!position) {
      if (
        cooldownRemaining > 0
      ) {
        continue;
      }


      const signal =
        getSignal(
          candles,
          i,
          indicators,
          settings,
          strategyState
        );


      if (!signal) {
        continue;
      }


      const positionSize =
        Number(
          settings.positionSize
        );


      if (
        positionSize <= 0
      ) {
        throw new Error(
          "Position size must be greater than 0"
        );
      }


      const quantity =
        positionSize /
        signal.entry;


      position = {
        direction:
          signal.direction,

        entry:
          signal.entry,

        entryTime:
          candle.time,

        quantity,

        positionSize,

        atr:
          signal.atr,

        takeProfit:
          signal.takeProfit,
      };


      continue;
    }


    // ==================================================
    // OPPOSITE SIGNAL / REVERSAL
    // ==================================================

    const signal =
      getSignal(
        candles,
        i,
        indicators,
        settings,
        strategyState
      );


    if (!signal) {
      continue;
    }


    // ==================================================
    // SAME DIRECTION
    // ==================================================

    if (
      signal.direction ===
      position.direction
    ) {
      continue;
    }


    // ==================================================
    // CLOSE CURRENT POSITION
    // ==================================================

    const exitPrice =
      signal.entry;

    let pnl;


    if (
      position.direction ===
      "LONG"
    ) {
      pnl =
        (
          exitPrice -
          position.entry
        ) *
        position.quantity;
    } else {
      pnl =
        (
          position.entry -
          exitPrice
        ) *
        position.quantity;
    }


    balance += pnl;


    trades.push({
      direction:
        position.direction,

      entryTime:
        position.entryTime,

      exitTime:
        candle.time,

      entry:
        position.entry,

      exit:
        exitPrice,

      stopLoss:
        null,

      takeProfit:
        position.takeProfit,

      result:
        pnl >= 0
          ? "WIN"
          : "LOSS",

      pnl,

      exitReason:
        "REVERSAL",
    });


    // ==================================================
    // OPEN OPPOSITE POSITION
    // ==================================================

    const positionSize =
      Number(
        settings.positionSize
      );


    const quantity =
      positionSize /
      signal.entry;


    position = {
      direction:
        signal.direction,

      entry:
        signal.entry,

      entryTime:
        candle.time,

      quantity,

      positionSize,

      atr:
        signal.atr,

      takeProfit:
        signal.takeProfit,
    };
  }


  // ==================================================
  // CLOSE REMAINING POSITION
  // ==================================================
  //
  // There is no forced market close in the
  // Pine strategy. Therefore we do NOT add
  // the unfinished position to completed trades.
  //
  // ==================================================


  // ==================================================
  // STATISTICS
  // ==================================================

  const winners =
    trades.filter(
      (trade) =>
        trade.pnl > 0
    );

  const losers =
    trades.filter(
      (trade) =>
        trade.pnl < 0
    );


  const netProfit =
    balance -
    startingBalance;


  const winRate =
    trades.length === 0
      ? 0
      : (
          winners.length /
          trades.length
        ) *
        100;


  const grossProfit =
    winners.reduce(
      (sum, trade) =>
        sum + trade.pnl,
      0
    );


  const grossLoss =
    Math.abs(
      losers.reduce(
        (sum, trade) =>
          sum + trade.pnl,
        0
      )
    );


  let profitFactor;

  if (
    grossLoss === 0
  ) {
    profitFactor =
      grossProfit > 0
        ? Infinity
        : 0;
  } else {
    profitFactor =
      grossProfit /
      grossLoss;
  }


  return {
    startingBalance,

    endingBalance:
      balance,

    netProfit,

    totalTrades:
      trades.length,

    winners:
      winners.length,

    losers:
      losers.length,

    winRate,

    profitFactor,

    trades,
  };
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  runBacktest,
};

