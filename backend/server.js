const express = require("express");
const cors = require("cors");

const {
  runBacktest,
} = require("./backtest");

const {
  runOptimizer,
} = require("./optimizer");

const app = express();

const PORT = 3001;


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json());


// ======================================================
// SUPPORTED TIMEFRAMES
// ======================================================

const TIMEFRAME_MAP = {

  "1m": "1m",

  "5m": "5m",

  "15m": "15m",

  "1H": "1h",

  "4H": "4h",

  "1D": "1d",

};


// ======================================================
// GET BINANCE INTERVAL
// ======================================================

function getBinanceInterval(timeframe) {

  const interval =
    TIMEFRAME_MAP[timeframe];

  if (!interval) {

    throw new Error(
      `Unsupported timeframe: ${timeframe}`
    );

  }

  return interval;
}


// ======================================================
// NORMALIZE BINANCE CANDLES
// ======================================================

function normalizeCandles(data) {

  return data.map((candle) => ({

    time: candle[0],

    open: Number(candle[1]),

    high: Number(candle[2]),

    low: Number(candle[3]),

    close: Number(candle[4]),

    volume: Number(candle[5]),

    closeTime: candle[6],

    quoteVolume: Number(candle[7]),

    trades: candle[8],

    takerBuyBaseVolume:
      Number(candle[9]),

    takerBuyQuoteVolume:
      Number(candle[10]),

  }));

}


// ======================================================
// FETCH HISTORICAL BINANCE CANDLES
// ======================================================
//
// Binance Futures API maximum:
// 1000 candles per request.
//
// Examples:
//
// 1m  × 10 days  = 14,400 candles
// 5m  × 10 days  = 2,880 candles
// 15m × 10 days  = 960 candles
// 15m × 111 days = 10,656 candles
//
// The function automatically makes multiple requests
// when more than 1000 candles are required.
// ======================================================

async function fetchHistoricalCandles(
  symbol,
  interval,
  days = 10
) {

  const candlesPerDay = {

    "1m": 1440,

    "3m": 480,

    "5m": 288,

    "15m": 96,

    "30m": 48,

    "1h": 24,

    "2h": 12,

    "4h": 6,

    "6h": 4,

    "8h": 3,

    "12h": 2,

    "1d": 1,

  };


  const perDay =
    candlesPerDay[interval];


  if (!perDay) {

    throw new Error(
      `Unsupported Binance interval: ${interval}`
    );

  }


  const targetCandles =
    Math.floor(days * perDay);


  if (targetCandles <= 0) {

    throw new Error(
      `Invalid number of days: ${days}`
    );

  }


  const allCandles = [];

  let endTime = Date.now();


  // ====================================================
  // FETCH IN BATCHES
  // ====================================================

  while (
    allCandles.length <
    targetCandles
  ) {

    const remaining =
      targetCandles -
      allCandles.length;


    const limit =
      Math.min(
        1000,
        remaining
      );


    const url =
      `https://fapi.binance.com/fapi/v1/klines` +
      `?symbol=${encodeURIComponent(symbol)}` +
      `&interval=${interval}` +
      `&limit=${limit}` +
      `&endTime=${endTime}`;


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        `Binance API error for ${symbol}: ${response.status}`
      );

    }


    const data =
      await response.json();


    if (
      !Array.isArray(data) ||
      data.length === 0
    ) {

      break;

    }


    const batch =
      normalizeCandles(data);


    allCandles.push(
      ...batch
    );


    // Move backwards to the candle immediately
    // before the oldest candle we just received.

    endTime =
      data[0][0] - 1;


    console.log(
      `${symbol} ${interval}: ` +
      `${allCandles.length}/${targetCandles} candles`
    );


    if (
      data.length < limit
    ) {

      break;

    }

  }


  // ====================================================
  // REMOVE DUPLICATES
  // ====================================================

  const unique =
    new Map();


  for (
    const candle of allCandles
  ) {

    unique.set(
      candle.time,
      candle
    );

  }


  // ====================================================
  // SORT OLDEST → NEWEST
  // ====================================================

  const sorted =
    Array.from(
      unique.values()
    ).sort(
      (a, b) =>
        a.time - b.time
    );


  // ====================================================
  // RETURN REQUESTED AMOUNT
  // ====================================================

  return sorted.slice(
    -targetCandles
  );

}


// ======================================================
// HEALTH CHECK
// ======================================================

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      status: "ok",

      message:
        "Strategy Tester API is running",

    });

  }
);


// ======================================================
// MARKET DATA
// ======================================================

app.get(
  "/api/market-data",
  async (req, res) => {

    try {

      const symbol =
        req.query.symbol ||
        "BTCUSDT";


      const interval =
        req.query.interval ||
        "4h";


      const limit = 1000;


      const url =
        `https://fapi.binance.com/fapi/v1/klines` +
        `?symbol=${encodeURIComponent(symbol)}` +
        `&interval=${interval}` +
        `&limit=${limit}`;


      const response =
        await fetch(url);


      if (!response.ok) {

        throw new Error(
          `Binance API error: ${response.status}`
        );

      }


      const data =
        await response.json();


      const candles =
        normalizeCandles(data);


      res.json({

        success: true,

        symbol,

        interval,

        count:
          candles.length,

        candles,

      });

    } catch (error) {

      console.error(error);


      res.status(500).json({

        success: false,

        error:
          error.message,

      });

    }

  }
);


// ======================================================
// BACKTEST
// ======================================================

app.post(
  "/api/backtest",
  async (req, res) => {

    try {

      const {
        symbol,
        timeframe,
        balance,
        risk,
        riskReward,
        cooldown,
      } = req.body;


      // --------------------------------------------------
      // TIMEFRAME
      // --------------------------------------------------

      const interval =
        getBinanceInterval(timeframe);


      // --------------------------------------------------
      // BACKTEST DATA
      // --------------------------------------------------

      const days = 60;


      const candles =
        await fetchHistoricalCandles(
          symbol,
          interval,
          days
        );


      console.log(
        `Fetched ${candles.length} candles for ` +
        `${symbol} ${timeframe} (${days} days)`
      );


      // --------------------------------------------------
      // RUN BACKTEST
      // --------------------------------------------------

      const results =
        runBacktest(
          candles,
          {

            balance,

            risk,

            riskReward,

            cooldown,

          }
        );


      // --------------------------------------------------
      // CONSOLE RESULTS
      // --------------------------------------------------

      console.log(
        "Backtest results:"
      );

      console.log(
        "------------------"
      );

      console.log(
        `Starting balance: $${results.startingBalance.toFixed(2)}`
      );

      console.log(
        `Ending balance:   $${results.endingBalance.toFixed(2)}`
      );

      console.log(
        `Net profit:       $${results.netProfit.toFixed(2)}`
      );

      console.log(
        `Total trades:     ${results.totalTrades}`
      );

      console.log(
        `Winners:          ${results.winners}`
      );

      console.log(
        `Losers:           ${results.losers}`
      );

      console.log(
        `Win rate:         ${results.winRate.toFixed(2)}%`
      );

      console.log(
        `Profit factor:    ${
          results.profitFactor === Infinity
            ? "∞"
            : results.profitFactor.toFixed(2)
        }`
      );


      // --------------------------------------------------
      // RESPONSE
      // --------------------------------------------------

      res.json({

        success: true,

        symbol,

        timeframe,

        days,

        settings: {

          balance,

          risk,

          riskReward,

          cooldown,

        },

        count:
          candles.length,

        results,

      });

    } catch (error) {

      console.error(error);


      res.status(500).json({

        success: false,

        error:
          error.message,

      });

    }

  }
);


// ======================================================
// MULTI-COIN OPTIMIZER
// ======================================================
//
// The number of days is supplied in the request.
//
// Example:
//
// {
//   "symbols": ["POLUSDT"],
//   "timeframe": "1m",
//   "days": 10
// }
//
// This means:
//
// POLUSDT
// 1-minute candles
// 10 days
//
// Approximately 14,400 candles.
// ======================================================

app.post(
  "/api/optimize",
  async (req, res) => {

    try {

      const {
        symbols,
        timeframe,
        days: requestedDays,
      } = req.body;


      // ==================================================
      // TIMEFRAME
      // ==================================================

      const interval =
        getBinanceInterval(timeframe);


      // ==================================================
      // DAYS
      // ==================================================

      const days =
        Number(requestedDays) || 30;


      if (days <= 0) {

        return res.status(400).json({

          success: false,

          error:
            `Invalid days value: ${requestedDays}`,

        });

      }


      // ==================================================
      // SYMBOLS
      // ==================================================

      const symbolList =
        Array.isArray(symbols)
          ? symbols
          : [
              symbols ||
              "BTCUSDT",
            ];


      // ==================================================
      // RESULTS
      // ==================================================

      const results = [];

      let totalCombinations = 0;

      let totalCompleted = 0;

      const overallStart =
        Date.now();


      // ==================================================
      // RUN EACH SYMBOL
      // ==================================================

      for (
        const symbol of symbolList
      ) {

        console.log("");

        console.log(
          "=================================================="
        );

        console.log(
          `Optimizing ${symbol} ${timeframe} for ${days} days`
        );

        console.log(
          "=================================================="
        );


        // ------------------------------------------------
        // FETCH HISTORICAL DATA
        // ------------------------------------------------

        const candles =
          await fetchHistoricalCandles(
            symbol,
            interval,
            days
          );


        console.log(
          `Fetched ${candles.length} candles for ` +
          `${symbol} ${timeframe} (${days} days)`
        );


        // ------------------------------------------------
        // RUN OPTIMIZER
        // ------------------------------------------------

        const optimization =
          runOptimizer(

            candles,

            {

              balance: 100,

              margin: 3,

              leverage: 10,

              roundTripFee: 0.04,

              cooldownBars: 0,

            }

          );


        // ------------------------------------------------
        // TOTALS
        // ------------------------------------------------

        totalCombinations +=
          optimization.totalCombinations;


        totalCompleted +=
          optimization.completed;


        // ------------------------------------------------
        // STORE RESULTS
        // ------------------------------------------------

        results.push({

          symbol,

          timeframe,

          days,

          candles:
            candles.length,

          totalCombinations:
            optimization.totalCombinations,

          completed:
            optimization.completed,

          elapsedSeconds:
            optimization.elapsedSeconds,

          results:
            optimization.results,

        });


        // ------------------------------------------------
        // BEST RESULT
        // ------------------------------------------------

        console.log("");

        console.log(
          `Best result for ${symbol}:`
        );


        if (
          optimization.results.length > 0
        ) {

          console.log(
            optimization.results[0]
          );

        } else {

          console.log(
            "No valid results."
          );

        }

      }


      // ==================================================
      // TOTAL TIME
      // ==================================================

      const elapsedSeconds =
        (
          Date.now() -
          overallStart
        ) / 1000;


      // ==================================================
      // RESPONSE
      // ==================================================

      res.json({

        success: true,

        symbols:
          symbolList,

        timeframe,

        days,

        totalCombinations,

        completed:
          totalCompleted,

        elapsedSeconds,

        results,

      });

    } catch (error) {

      console.error(error);


      res.status(500).json({

        success: false,

        error:
          error.message,

      });

    }

  }
);


// ======================================================
// START SERVER
// ======================================================

app.listen(
  PORT,
  () => {

    console.log(
      `Strategy Tester API running on http://localhost:${PORT}`
    );

    console.log(
      "Supported timeframes:",
      Object.keys(TIMEFRAME_MAP).join(", ")
    );

  }
);

