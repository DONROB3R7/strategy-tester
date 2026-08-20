const express = require("express");
const cors = require("cors");

const {
  runBacktest,
} = require("./backtest");

const {
  runOptimizer,
  buildGrid,
} = require("./optimizer");


console.log(
  "OPTIMIZER MODULE LOADED:",
  require.resolve("./optimizer")
);

console.log(
  "runOptimizer type:",
  typeof runOptimizer
);

console.log(
  "buildGrid type:",
  typeof buildGrid
);


const app = express();

const PORT = 3001;


app.use(
  cors()
);

app.use(
  express.json()
);


// ======================================================
// TIMEFRAMES
// ======================================================

const TIMEFRAME_MAP = {

  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1H": "1h",
  "4H": "4h",
  "12H": "12h",
  "1D": "1d",

};


function getBinanceInterval(
  timeframe
) {

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
// NORMALIZE CANDLES
// ======================================================

function normalizeCandles(
  data
) {

  return data.map(
    candle => ({

      time:
        candle[0],

      open:
        Number(
          candle[1]
        ),

      high:
        Number(
          candle[2]
        ),

      low:
        Number(
          candle[3]
        ),

      close:
        Number(
          candle[4]
        ),

      volume:
        Number(
          candle[5]
        ),

      closeTime:
        candle[6],

      quoteVolume:
        Number(
          candle[7]
        ),

      trades:
        candle[8],

      takerBuyBaseVolume:
        Number(
          candle[9]
        ),

      takerBuyQuoteVolume:
        Number(
          candle[10]
        ),

    })
  );

}


// ======================================================
// FETCH FUTURES CANDLES
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
    Math.floor(
      Number(days) *
      perDay
    );


  if (
    !Number.isFinite(
      targetCandles
    ) ||
    targetCandles <= 0
  ) {

    throw new Error(
      `Invalid number of days: ${days}`
    );

  }


  const allCandles = [];

  let endTime =
    Date.now();


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
      await fetch(
        url
      );


    if (!response.ok) {

      const errorText =
        await response.text();


      throw new Error(
        `Binance API error for ${symbol}: ` +
        `${response.status} ${errorText}`
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


    allCandles.push(
      ...normalizeCandles(
        data
      )
    );


    endTime =
      data[0][0] - 1;


    console.log(
      `${symbol} ${interval}: ` +
      `${allCandles.length}/${targetCandles} candles`
    );


    if (
      data.length <
      limit
    ) {

      break;

    }

  }


  const unique =
    new Map();


  for (
    const candle
    of allCandles
  ) {

    unique.set(
      candle.time,
      candle
    );

  }


  const sorted =
    Array.from(
      unique.values()
    ).sort(
      (
        a,
        b
      ) =>
        a.time -
        b.time
    );


  return sorted.slice(
    -targetCandles
  );

}


// ======================================================
// HEALTH
// ======================================================

app.get(
  "/api/health",
  (
    req,
    res
  ) => {

    res.json({

      success:
        true,

      status:
        "ok",

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
  async (
    req,
    res
  ) => {

    try {

      const symbol =
        String(
          req.query.symbol ||
          "BTCUSDT"
        )
          .trim()
          .toUpperCase();


      const interval =
        req.query.interval ||
        "4h";


      const url =
        `https://fapi.binance.com/fapi/v1/klines` +
        `?symbol=${encodeURIComponent(symbol)}` +
        `&interval=${interval}` +
        `&limit=1000`;


      const response =
        await fetch(
          url
        );


      if (!response.ok) {

        throw new Error(
          `Binance API error: ${response.status}`
        );

      }


      const data =
        await response.json();


      const candles =
        normalizeCandles(
          data
        );


      res.json({

        success:
          true,

        symbol,

        interval,

        count:
          candles.length,

        candles,

      });

    } catch (
      error
    ) {

      console.error(
        "Market data error:",
        error
      );


      res.status(500).json({

        success:
          false,

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
  async (
    req,
    res
  ) => {

    try {

      const {
        symbol,
        timeframe,
        balance,
        risk,
        riskReward,
        cooldown,
      } =
        req.body;


      const interval =
        getBinanceInterval(
          timeframe
        );


      const cleanSymbol =
        String(
          symbol ||
          "BTCUSDT"
        )
          .trim()
          .toUpperCase();


      const days =
        60;


      const candles =
        await fetchHistoricalCandles(
          cleanSymbol,
          interval,
          days
        );


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


      res.json({

        success:
          true,

        symbol:
          cleanSymbol,

        timeframe,

        days,

        count:
          candles.length,

        results,

      });

    } catch (
      error
    ) {

      console.error(
        "Backtest error:",
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          error.message,

      });

    }

  }
);


// ======================================================
// MULTI-COIN OPTIMIZER
// ======================================================

app.post(
  "/api/optimize",
  async (
    req,
    res
  ) => {

    try {

      const {
        symbols,
        timeframe,
        days:
          requestedDays,
      } =
        req.body;


      const interval =
        getBinanceInterval(
          timeframe
        );


      const days =
        Number(
          requestedDays
        ) || 30;


      const symbolList =
        Array.isArray(
          symbols
        )
          ? symbols
          : [

              symbols ||
              "BTCUSDT",

            ];


      const results = [];

      let totalCombinations =
        0;

      let totalCompleted =
        0;


      const overallStart =
        Date.now();


      for (
        const rawSymbol
        of symbolList
      ) {

        const symbol =
          String(
            rawSymbol
          )
            .trim()
            .toUpperCase();


        const candles =
          await fetchHistoricalCandles(
            symbol,
            interval,
            days
          );


        const optimization =
          await runOptimizer(
            candles,

            {

              balance: 100,

              margin: 3,

              leverage: 10,

              roundTripFee: 0.04,

              cooldownBars: 0,

            }
          );


        totalCombinations +=
          Number(
            optimization.totalCombinations ||
            0
          );


        totalCompleted +=
          Number(
            optimization.completed ||
            0
          );


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
            optimization.results ||
            [],

        });

      }


      const elapsedSeconds =
        (
          Date.now() -
          overallStart
        ) / 1000;


      res.json({

        success:
          true,

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

    } catch (
      error
    ) {

      console.error(
        "Optimizer error:",
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          error.message,

      });

    }

  }
);


// ======================================================
// SIMULATION
// ======================================================

app.post(
  "/api/simulate",
  async (
    req,
    res
  ) => {

    try {

      const {

        symbol,

        timeframe,

        days,

        baseSettings,

        optimization,

      } =
        req.body;


      console.log("");

      console.log(
        "=================================================="
      );

      console.log(
        "SIMULATION REQUEST"
      );

      console.log(
        "=================================================="
      );

      console.log(
        "Symbol:",
        symbol
      );

      console.log(
        "Timeframe:",
        timeframe
      );

      console.log(
        "Days:",
        days
      );


      const safeBaseSettings =
        baseSettings &&
        typeof baseSettings ===
          "object"
          ? baseSettings
          : {};


      const safeOptimization =
        optimization &&
        typeof optimization ===
          "object"
          ? optimization
          : {};


      if (!symbol) {

        return res.status(
          400
        ).json({

          success:
            false,

          error:
            "Symbol is required.",

        });

      }


      if (!timeframe) {

        return res.status(
          400
        ).json({

          success:
            false,

          error:
            "Timeframe is required.",

        });

      }


      const simulationDays =
        Number(
          days
        );


      if (
        !Number.isFinite(
          simulationDays
        ) ||
        simulationDays <= 0
      ) {

        return res.status(
          400
        ).json({

          success:
            false,

          error:
            "Days must be greater than 0.",

        });

      }


      const cleanSymbol =
        String(
          symbol
        )
          .trim()
          .toUpperCase();


      const interval =
        getBinanceInterval(
          timeframe
        );


      // ==================================================
      // FETCH
      // ==================================================

      const candles =
        await fetchHistoricalCandles(
          cleanSymbol,
          interval,
          simulationDays
        );


      console.log(
        `Fetched ${candles.length} candles`
      );


      if (
        candles.length === 0
      ) {

        throw new Error(
          "No historical candles were returned."
        );

      }


      // ==================================================
      // BUILD GRID
      // ==================================================

      const grid =
        buildGrid({

          baseSettings:
            safeBaseSettings,

          optimize:
            safeOptimization,

        });


      // ==================================================
      // PRINT GRID
      // ==================================================

      console.log("");

      console.log(
        "SIMULATION PARAMETER GRID"
      );

      console.log(
        "----------------------------------------------"
      );

      console.log(
        "EMA:",
        grid.emaLength
      );

      console.log(
        "SMA:",
        grid.smaLength
      );

      console.log(
        "Source:",
        grid.source
      );

      console.log(
        "KC Length:",
        grid.keltnerLength
      );

      console.log(
        "KC Mult:",
        grid.keltnerMultiplier
      );

      console.log(
        "ATR:",
        grid.atrLength
      );

      console.log(
        "Stoch Length:",
        grid.stochasticLength
      );

      console.log(
        "Stoch Smooth:",
        grid.stochasticSmoothing
      );

      console.log(
        "MACD Fast:",
        grid.macdFast
      );

      console.log(
        "MACD Slow:",
        grid.macdSlow
      );

      console.log(
        "MACD Signal:",
        grid.macdSignal
      );

      console.log(
        "TP:",
        grid.tpAtr
      );

      console.log(
        "SL:",
        grid.slAtr
      );


      // ==================================================
      // COUNT
      // ==================================================

      const expectedCombinations =
        Object.values(
          grid
        ).reduce(
          (
            total,
            values
          ) =>
            total *
            values.length,
          1
        );


      console.log("");

      console.log(
        "EXPECTED COMBINATIONS:",
        expectedCombinations
      );


      // ==================================================
      // SETTINGS
      // ==================================================

      const optimizerSettings = {

        ...safeBaseSettings,

        balance:
          Number(
            safeBaseSettings.balance ??
            100
          ),

        margin:
          Number(
            safeBaseSettings.margin ??
            3
          ),

        leverage:
          Number(
            safeBaseSettings.leverage ??
            10
          ),

        roundTripFee:
          Number(
            safeBaseSettings.roundTripFee ??
            0.04
          ),

        cooldownBars:
          Number(
            safeBaseSettings.cooldownBars ??
            0
          ),

      };


      // ==================================================
      // RUN OPTIMIZER
      // ==================================================

      console.log("");

      console.log(
        "STARTING WORKER OPTIMIZER..."
      );


      // IMPORTANT:
      // await is required because runOptimizer()
      // uses worker threads and returns a Promise.

      const simulation =
        await runOptimizer(

          candles,

          optimizerSettings,

          {
            grid,
          }

        );


      // ==================================================
      // RESULT
      // ==================================================

      const totalCombinations =
        Number(
          simulation?.totalCombinations ??
          expectedCombinations
        );


      const completed =
        Number(
          simulation?.completed ??
          0
        );


      const elapsedSeconds =
        Number(
          simulation?.elapsedSeconds ??
          0
        );


      const simulationResults =
        Array.isArray(
          simulation?.results
        )
          ? simulation.results
          : [];


      console.log("");

      console.log(
        "=================================================="
      );

      console.log(
        "SERVER RECEIVED OPTIMIZER RESULT"
      );

      console.log(
        "=================================================="
      );

      console.log(
        "Total combinations:",
        totalCombinations
      );

      console.log(
        "Completed:",
        completed
      );

      console.log(
        "Results:",
        simulationResults.length
      );


      console.log("");

      console.log(
        "=================================================="
      );

      console.log(
        "SIMULATION COMPLETE"
      );

      console.log(
        "=================================================="
      );

      console.log(
        `Tests: ${completed}/${totalCombinations}`
      );

      console.log(
        `Time: ${elapsedSeconds.toFixed(
          2
        )} seconds`
      );

      console.log(
        `Returned results: ${
          simulationResults.length
        }`
      );


      // ==================================================
      // RESPONSE
      // ==================================================

      res.json({

        success:
          true,

        symbol:
          cleanSymbol,

        timeframe,

        days:
          simulationDays,

        candles:
          candles.length,

        totalCombinations,

        completed,

        elapsedSeconds,

        results:
          simulationResults,

      });

    } catch (
      error
    ) {

      console.error("");

      console.error(
        "=================================================="
      );

      console.error(
        "SIMULATION ERROR"
      );

      console.error(
        "=================================================="
      );

      console.error(
        error
      );


      res.status(
        500
      ).json({

        success:
          false,

        error:
          error.message ||
          "Simulation failed.",

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

    console.log("");

    console.log(
      "=================================================="
    );

    console.log(
      `Strategy Tester API running on http://localhost:${PORT}`
    );

    console.log(
      "Supported timeframes:",
      Object.keys(
        TIMEFRAME_MAP
      ).join(", ")
    );

    console.log(
      "=================================================="
    );

  }
);