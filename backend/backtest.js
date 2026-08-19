const {
  calculateIndicators,
  getSignal,
} = require("./strategy");


function runBacktest(
  candles,
  settings
) {
  const trades = [];
  const equityCurve = [];

  let position = null;

  let balance = settings.balance;

  let peakBalance = balance;
  let maxDrawdown = 0;

  const riskPercent =
    settings.risk / 100;

  const riskReward =
    settings.riskReward;

  // ==================================================
  // CALCULATE INDICATORS
  // ==================================================

  const indicators =
    calculateIndicators(
      candles,
      settings
    );


  // ==================================================
  // MAIN LOOP
  // ==================================================

  for (
    let i = 0;
    i < candles.length;
    i++
  ) {
    const candle = candles[i];


    // ==================================================
    // MANAGE EXISTING POSITION
    // ==================================================

    if (position) {
      let exitPrice = null;
      let exitReason = null;


      // ==================================================
      // LONG POSITION
      // ==================================================

      if (
        position.direction ===
        "LONG"
      ) {
        const hitSL =
          candle.low <=
          position.stopLoss;

        const hitTP =
          candle.high >=
          position.takeProfit;


        // ----------------------------------------------
        // BOTH SL AND TP HIT
        // ----------------------------------------------

        if (hitSL && hitTP) {
          // Conservative assumption:
          // SL happened first.

          exitPrice =
            position.stopLoss;

          exitReason =
            "SL";
        }

        // ----------------------------------------------
        // ONLY SL
        // ----------------------------------------------

        else if (hitSL) {
          exitPrice =
            position.stopLoss;

          exitReason =
            "SL";
        }

        // ----------------------------------------------
        // ONLY TP
        // ----------------------------------------------

        else if (hitTP) {
          exitPrice =
            position.takeProfit;

          exitReason =
            "TP";
        }
      }


      // ==================================================
      // SHORT POSITION
      // ==================================================

      if (
        position.direction ===
        "SHORT"
      ) {
        const hitSL =
          candle.high >=
          position.stopLoss;

        const hitTP =
          candle.low <=
          position.takeProfit;


        // ----------------------------------------------
        // BOTH SL AND TP HIT
        // ----------------------------------------------

        if (hitSL && hitTP) {
          // Conservative assumption:
          // SL happened first.

          exitPrice =
            position.stopLoss;

          exitReason =
            "SL";
        }

        // ----------------------------------------------
        // ONLY SL
        // ----------------------------------------------

        else if (hitSL) {
          exitPrice =
            position.stopLoss;

          exitReason =
            "SL";
        }

        // ----------------------------------------------
        // ONLY TP
        // ----------------------------------------------

        else if (hitTP) {
          exitPrice =
            position.takeProfit;

          exitReason =
            "TP";
        }
      }


      // ==================================================
      // CLOSE POSITION
      // ==================================================

      if (exitPrice !== null) {
        const priceDifference =
          position.direction ===
          "LONG"
            ? exitPrice -
              position.entry
            : position.entry -
              exitPrice;


        const pnl =
          priceDifference *
          position.positionSize;


        balance += pnl;


        trades.push({
          entryCandle:
            position.entryCandle,

          exitCandle:
            i,

          entryTime:
            position.entryTime,

          exitTime:
            candle.time,

          direction:
            position.direction,

          entry:
            position.entry,

          exit:
            exitPrice,

          stopLoss:
            position.stopLoss,

          takeProfit:
            position.takeProfit,

          positionSize:
            position.positionSize,

          riskAmount:
            position.riskAmount,

          pnl,

          result:
            exitReason,

          exitType:
            "INTRABAR",
        });


        position = null;
      }
    }


    // ==================================================
    // UPDATE EQUITY
    // ==================================================

    if (
      balance >
      peakBalance
    ) {
      peakBalance =
        balance;
    }


    const drawdown =
      peakBalance > 0
        ? (
            (peakBalance -
              balance) /
            peakBalance
          ) * 100
        : 0;


    if (
      drawdown >
      maxDrawdown
    ) {
      maxDrawdown =
        drawdown;
    }


    equityCurve.push({
      candle: i,

      time:
        candle.time,

      balance,

      drawdown,
    });


    // ==================================================
    // DON'T ENTER WHILE POSITION EXISTS
    // ==================================================

    if (position) {
      continue;
    }


    // ==================================================
    // GET STRATEGY SIGNAL
    // ==================================================

    const signal =
      getSignal(
        candles,
        i,
        indicators,
        settings
      );


    if (!signal) {
      continue;
    }


    // ==================================================
    // VALIDATE SIGNAL
    // ==================================================

    if (
      signal.direction !==
        "LONG" &&
      signal.direction !==
        "SHORT"
    ) {
      continue;
    }


    if (
      !Number.isFinite(
        signal.entry
      ) ||
      !Number.isFinite(
        signal.stopLoss
      )
    ) {
      continue;
    }


    // ==================================================
    // ENTRY
    // ==================================================

    const entry =
      signal.entry;

    const stopLoss =
      signal.stopLoss;


    // ==================================================
    // RISK DISTANCE
    // ==================================================

    const riskDistance =
      Math.abs(
        entry -
          stopLoss
      );


    if (
      riskDistance <= 0
    ) {
      continue;
    }


    // ==================================================
    // MONEY RISK
    // ==================================================

    const riskAmount =
      balance *
      riskPercent;


    // ==================================================
    // POSITION SIZE
    // ==================================================

    const positionSize =
      riskAmount /
      riskDistance;


    // ==================================================
    // TAKE PROFIT
    // ==================================================

    let takeProfit;


    if (
      signal.direction ===
      "LONG"
    ) {
      takeProfit =
        entry +
        riskDistance *
          riskReward;
    } else {
      takeProfit =
        entry -
        riskDistance *
          riskReward;
    }


    // ==================================================
    // OPEN POSITION
    // ==================================================

    position = {
      direction:
        signal.direction,

      entry,

      entryCandle: i,

      entryTime:
        candle.time,

      stopLoss,

      takeProfit,

      positionSize,

      riskAmount,
    };
  }


  // ==================================================
  // CLOSE OPEN POSITION AT END
  // ==================================================

  if (position) {
    const lastCandle =
      candles[
        candles.length - 1
      ];


    const exitPrice =
      lastCandle.close;


    const priceDifference =
      position.direction ===
      "LONG"
        ? exitPrice -
          position.entry
        : position.entry -
          exitPrice;


    const pnl =
      priceDifference *
      position.positionSize;


    balance += pnl;


    trades.push({
      entryCandle:
        position.entryCandle,

      exitCandle:
        candles.length - 1,

      entryTime:
        position.entryTime,

      exitTime:
        lastCandle.time,

      direction:
        position.direction,

      entry:
        position.entry,

      exit:
        exitPrice,

      stopLoss:
        position.stopLoss,

      takeProfit:
        position.takeProfit,

      positionSize:
        position.positionSize,

      riskAmount:
        position.riskAmount,

      pnl,

      result:
        "END",

      exitType:
        "END_OF_DATA",
    });
  }


  // ==================================================
  // STATISTICS
  // ==================================================

  const totalTrades =
    trades.length;


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


  const totalProfit =
    winners.reduce(
      (sum, trade) =>
        sum + trade.pnl,
      0
    );


  const totalLoss =
    Math.abs(
      losers.reduce(
        (sum, trade) =>
          sum + trade.pnl,
        0
      )
    );


  const netProfit =
    totalProfit -
    totalLoss;


  const winRate =
    totalTrades > 0
      ? (
          winners.length /
          totalTrades
        ) * 100
      : 0;


  const profitFactor =
    totalLoss > 0
      ? totalProfit /
        totalLoss
      : totalProfit > 0
      ? Infinity
      : 0;


  const returnPercent =
    settings.balance > 0
      ? (
          netProfit /
          settings.balance
        ) * 100
      : 0;


  return {
    startingBalance:
      settings.balance,

    endingBalance:
      balance,

    netProfit,

    returnPercent,

    totalTrades,

    winners:
      winners.length,

    losers:
      losers.length,

    winRate,

    profitFactor,

    maxDrawdown,

    trades,

    equityCurve,
  };
}


module.exports = {
  runBacktest,
};