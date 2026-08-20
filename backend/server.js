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
  "=================================================="
);

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

console.log(
  "=================================================="
);


const app = express();

const PORT = 3001;


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
  cors()
);

app.use(
  express.json({
    limit: "10mb",
  })
);


// ======================================================
// TIMEFRAMES
// ======================================================

const TIMEFRAME_MAP = {

  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1H": "1h",
  "4H": "4h",
  "12H": "12h",
  "1D": "1d",

};


// ======================================================
// STAGED PARAMETER LIMITS
// ======================================================

const PARAMETER_LIMITS = {

  emaLength: {
    min: 5,
    max: 1000,
    integer: true,
  },

  smaLength: {
    min: 2,
    max: 500,
    integer: true,
  },

  keltnerLength: {
    min: 2,
    max: 200,
    integer: true,
  },

  keltnerMultiplier: {
    min: 0.1,
    max: 10,
    integer: false,
  },

  atrLength: {
    min: 2,
    max: 200,
    integer: true,
  },

  stochasticLength: {
    min: 2,
    max: 100,
    integer: true,
  },

  stochasticSmoothing: {
    min: 1,
    max: 20,
    integer: true,
  },

  macdFast: {
    min: 1,
    max: 100,
    integer: true,
  },

  macdSlow: {
    min: 2,
    max: 300,
    integer: true,
  },

  macdSignal: {
    min: 1,
    max: 100,
    integer: true,
  },

  tpAtr: {
    min: 0.1,
    max: 100,
    integer: false,
  },

  slAtr: {
    min: 0.1,
    max: 50,
    integer: false,
  },

};


// ======================================================
// TIMEFRAME
// ======================================================

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
        Number(
          candle[0]
        ),

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
        Number(
          candle[8]
        ),

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
//
// Binance Futures endpoint:
//
// https://fapi.binance.com/fapi/v1/klines
//
// So these are FUTURES candles.
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
      `?symbol=${encodeURIComponent(
        symbol
      )}` +
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
        `Binance Futures API error for ${symbol}: ` +
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
    const candle of allCandles
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
// BASE SETTINGS
// ======================================================

function normalizeBaseSettings(
  baseSettings
) {

  const base =
    baseSettings &&
    typeof baseSettings === "object"
      ? baseSettings
      : {};


  return {

    ...base,

    balance:
      Number(
        base.balance ??
        100
      ),

    source:
      base.source ??
      "low",

    emaLength:
      Number(
        base.emaLength ??
        200
      ),

    smaLength:
      Number(
        base.smaLength ??
        25
      ),

    keltnerLength:
      Number(
        base.keltnerLength ??
        10
      ),

    keltnerMultiplier:
      Number(
        base.keltnerMultiplier ??
        2
      ),

    atrLength:
      Number(
        base.atrLength ??
        15
      ),

    stochasticLength:
      Number(
        base.stochasticLength ??
        10
      ),

    stochasticSmoothing:
      Number(
        base.stochasticSmoothing ??
        1
      ),

    macdFast:
      Number(
        base.macdFast ??
        4
      ),

    macdSlow:
      Number(
        base.macdSlow ??
        34
      ),

    macdSignal:
      Number(
        base.macdSignal ??
        5
      ),

    tpAtr:
      Number(
        base.tpAtr ??
        15
      ),

    slAtr:
      base.slAtr === null ||
      base.slAtr === undefined
        ? 3
        : Number(
            base.slAtr
          ),

    margin:
      Number(
        base.margin ??
        3
      ),

    leverage:
      Number(
        base.leverage ??
        10
      ),

    roundTripFee:
      Number(
        base.roundTripFee ??
        0.04
      ),

    cooldownBars:
      Number(
        base.cooldownBars ??
        0
      ),

  };

}


// ======================================================
// BUILD RANGE
// ======================================================

function buildParameterRange(
  parameter,
  from,
  to,
  step
) {

  const limits =
    PARAMETER_LIMITS[
      parameter
    ];


  if (!limits) {

    throw new Error(
      `Unsupported optimization parameter: ${parameter}`
    );

  }


  let start =
    Number(
      from
    );

  let end =
    Number(
      to
    );

  const increment =
    Number(
      step
    );


  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    !Number.isFinite(increment) ||
    increment <= 0
  ) {

    throw new Error(
      `Invalid ${parameter} range.`
    );

  }


  if (
    end < start
  ) {

    throw new Error(
      `${parameter}: To (${end}) must be greater than or equal to From (${start}).`
    );

  }


  if (
    start < limits.min ||
    end > limits.max
  ) {

    throw new Error(
      `${parameter} allowed range is ${limits.min} → ${limits.max}. ` +
      `Received ${start} → ${end}.`
    );

  }


  const values = [];


  for (
    let value = start;

    value <=
      end +
      increment * 0.000001;

    value += increment
  ) {

    let output =
      Number(
        value.toFixed(
          10
        )
      );


    if (
      limits.integer
    ) {

      output =
        Math.round(
          output
        );

    }


    values.push(
      output
    );

  }


  return [
    ...new Set(
      values
    ),
  ];

}


// ======================================================
// BUILD ONE-PARAMETER GRID
// ======================================================
//
// selectedValues contains the current best values.
//
// Example:
//
// selectedValues = {
//
//   emaLength: 405,
//   smaLength: 20,
//   ...
//
// }
//
// If parameter = "smaLength":
//
// SMA gets the range.
// Everything else is fixed.
//
// ======================================================

function buildStagedGrid({
  parameter,
  range,
  baseSettings,
  selectedValues,
}) {

  const base =
    normalizeBaseSettings(
      baseSettings
    );


  const selected =
    selectedValues &&
    typeof selectedValues === "object"
      ? selectedValues
      : {};


  const fixed = {

    emaLength:
      Number(
        selected.emaLength ??
        base.emaLength
      ),

    smaLength:
      Number(
        selected.smaLength ??
        base.smaLength
      ),

    source:
      base.source,

    keltnerLength:
      Number(
        selected.keltnerLength ??
        base.keltnerLength
      ),

    keltnerMultiplier:
      Number(
        selected.keltnerMultiplier ??
        base.keltnerMultiplier
      ),

    atrLength:
      Number(
        selected.atrLength ??
        base.atrLength
      ),

    stochasticLength:
      Number(
        selected.stochasticLength ??
        base.stochasticLength
      ),

    stochasticSmoothing:
      Number(
        selected.stochasticSmoothing ??
        base.stochasticSmoothing
      ),

    macdFast:
      Number(
        selected.macdFast ??
        base.macdFast
      ),

    macdSlow:
      Number(
        selected.macdSlow ??
        base.macdSlow
      ),

    macdSignal:
      Number(
        selected.macdSignal ??
        base.macdSignal
      ),

    tpAtr:
      Number(
        selected.tpAtr ??
        base.tpAtr
      ),

    slAtr:
      selected.slAtr === null
        ? null
        : Number(
            selected.slAtr ??
            base.slAtr
          ),

  };


  return {

    emaLength:
      parameter === "emaLength"
        ? range
        : [
            fixed.emaLength
          ],

    smaLength:
      parameter === "smaLength"
        ? range
        : [
            fixed.smaLength
          ],

    source: [
      fixed.source
    ],

    keltnerLength:
      parameter === "keltnerLength"
        ? range
        : [
            fixed.keltnerLength
          ],

    keltnerMultiplier:
      parameter === "keltnerMultiplier"
        ? range
        : [
            fixed.keltnerMultiplier
          ],

    atrLength:
      parameter === "atrLength"
        ? range
        : [
            fixed.atrLength
          ],

    stochasticLength:
      parameter === "stochasticLength"
        ? range
        : [
            fixed.stochasticLength
          ],

    stochasticSmoothing:
      parameter === "stochasticSmoothing"
        ? range
        : [
            fixed.stochasticSmoothing
          ],

    macdFast:
      parameter === "macdFast"
        ? range
        : [
            fixed.macdFast
          ],

    macdSlow:
      parameter === "macdSlow"
        ? range
        : [
            fixed.macdSlow
          ],

    macdSignal:
      parameter === "macdSignal"
        ? range
        : [
            fixed.macdSignal
          ],

    tpAtr:
      parameter === "tpAtr"
        ? range
        : [
            fixed.tpAtr
          ],

    slAtr:
      parameter === "slAtr"
        ? range
        : [
            fixed.slAtr
          ],

  };

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
//
// OLD ENDPOINT PRESERVED.
// Also uses Binance FUTURES.
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
        `?symbol=${encodeURIComponent(
          symbol
        )}` +
        `&interval=${interval}` +
        `&limit=1000`;


      const response =
        await fetch(
          url
        );


      if (!response.ok) {

        const errorText =
          await response.text();


        throw new Error(
          `Binance Futures API error: ` +
          `${response.status} ${errorText}`
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

        market:
          "BINANCE_USDT_FUTURES",

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


      res.status(
        500
      ).json({

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


      res.status(
        500
      ).json({

        success:
          false,

        error:
          error.message,

      });

    }

  }
);


// ======================================================
// ORIGINAL MULTI-COIN OPTIMIZER
// ======================================================
//
// PRESERVED.
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


        console.log("");

        console.log(
          "=================================================="
        );

        console.log(
          `MULTI-COIN OPTIMIZATION: ${symbol}`
        );

        console.log(
          "=================================================="
        );


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

              balance:
                100,

              margin:
                3,

              leverage:
                10,

              roundTripFee:
                0.04,

              cooldownBars:
                0,

            }

          );


        totalCombinations +=
          Number(
            optimization?.totalCombinations ??
            0
          );


        totalCompleted +=
          Number(
            optimization?.completed ??
            0
          );


        results.push({

          symbol,

          timeframe,

          days,

          candles:
            candles.length,

          totalCombinations:
            optimization?.totalCombinations ??
            0,

          completed:
            optimization?.completed ??
            0,

          elapsedSeconds:
            optimization?.elapsedSeconds ??
            0,

          results:
            optimization?.results ||
            [],

        });

      }


      const elapsedSeconds =
        (
          Date.now() -
          overallStart
        ) /
        1000;


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


      res.status(
        500
      ).json({

        success:
          false,

        error:
          error.message,

      });

    }

  }
);


// ======================================================
// OLD FULL SIMULATION
// ======================================================
//
// PRESERVED EXACT API:
// POST /api/simulate
//
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


      const candles =
        await fetchHistoricalCandles(
          cleanSymbol,
          interval,
          simulationDays
        );


      if (
        candles.length === 0
      ) {

        throw new Error(
          "No historical candles were returned."
        );

      }


      const safeBaseSettings =
        normalizeBaseSettings(
          baseSettings
        );


      const safeOptimization =
        optimization &&
        typeof optimization === "object"
          ? optimization
          : {};


      const grid =
        buildGrid({

          baseSettings:
            safeBaseSettings,

          optimize:
            safeOptimization,

        });


      const expectedCombinations =
        Object.values(
          grid
        ).reduce(
          (
            total,
            values
          ) =>
            total *
            (
              Array.isArray(values)
                ? values.length
                : 1
            ),
          1
        );


      console.log("");

      console.log(
        "=================================================="
      );

      console.log(
        "FULL SIMULATION"
      );

      console.log(
        "=================================================="
      );

      console.log(
        `Coin:       ${cleanSymbol}`
      );

      console.log(
        `Timeframe:  ${timeframe}`
      );

      console.log(
        `Days:       ${simulationDays}`
      );

      console.log(
        `Expected:   ${expectedCombinations}`
      );


      console.log(
        "GRID:",
        grid
      );


      const simulation =
        await runOptimizer(
          candles,

          {

            ...safeBaseSettings,

          },

          {

            grid,

          }

        );


      const simulationResults =
        Array.isArray(
          simulation?.results
        )
          ? simulation.results
          : [];


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

        totalCombinations:
          Number(
            simulation?.totalCombinations ??
            expectedCombinations
          ),

        completed:
          Number(
            simulation?.completed ??
            0
          ),

        elapsedSeconds:
          Number(
            simulation?.elapsedSeconds ??
            0
          ),

        results:
          simulationResults,

      });

    } catch (
      error
    ) {

      console.error(
        "Simulation error:",
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
// NEW STAGED OPTIMIZER
// ======================================================
//
// ONE endpoint for ALL steps.
//
// App.jsx sends:
//
// {
//   symbol,
//   timeframe,
//   days,
//   parameter,
//   from,
//   to,
//   step,
//   baseSettings,
//   selectedValues
// }
//
// Example:
//
// parameter = "emaLength"
//
// Then only EMA changes.
//
// After best EMA is selected:
//
// selectedValues.emaLength = best EMA
//
// Next request:
//
// parameter = "smaLength"
//
// Then only SMA changes.
//
// ======================================================

app.post(
  "/api/optimize-step",
  async (
    req,
    res
  ) => {

    try {

      const {

        symbol,

        timeframe,

        days,

        parameter,

        from,

        to,

        step,

        baseSettings,

        selectedValues,

      } =
        req.body;


      // ==================================================
      // VALIDATION
      // ==================================================

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


      if (
        !PARAMETER_LIMITS[
          parameter
        ]
      ) {

        return res.status(
          400
        ).json({

          success:
            false,

          error:
            `Unknown staged parameter: ${parameter}`,

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


      // ==================================================
      // RANGE
      // ==================================================

      const values =
        buildParameterRange(
          parameter,
          from,
          to,
          step
        );


      if (
        values.length === 0
      ) {

        throw new Error(
          `No values generated for ${parameter}.`
        );

      }


      // ==================================================
      // SYMBOL / INTERVAL
      // ==================================================

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
      // LOG
      // ==================================================

      console.log("");

      console.log(
        "=================================================="
      );

      console.log(
        "STAGED OPTIMIZATION"
      );

      console.log(
        "=================================================="
      );

      console.log(
        `Coin:       ${cleanSymbol}`
      );

      console.log(
        `Timeframe:  ${timeframe}`
      );

      console.log(
        `Days:       ${simulationDays}`
      );

      console.log(
        `Parameter:  ${parameter}`
      );

      console.log(
        `Range:      ${from} -> ${to}`
      );

      console.log(
        `Step:       ${step}`
      );

      console.log(
        `Tests:      ${values.length}`
      );

      console.log(
        "Selected values:",
        selectedValues
      );


      // ==================================================
      // FETCH FUTURES CANDLES
      // ==================================================

      const candles =
        await fetchHistoricalCandles(
          cleanSymbol,
          interval,
          simulationDays
        );


      if (
        candles.length === 0
      ) {

        throw new Error(
          "No historical candles were returned."
        );

      }


      console.log(
        `Fetched ${candles.length} candles`
      );


      // ==================================================
      // BUILD STAGED GRID
      // ==================================================

      const grid =
        buildStagedGrid({

          parameter,

          range:
            values,

          baseSettings,

          selectedValues,

        });


      // ==================================================
      // LOG GRID
      // ==================================================

      console.log("");

      console.log(
        "STAGED GRID"
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
      // OPTIMIZER SETTINGS
      // ==================================================

      const optimizerSettings =
        normalizeBaseSettings(
          baseSettings
        );


      // ==================================================
      // RUN WORKER OPTIMIZER
      // ==================================================

      console.log("");

      console.log(
        "STARTING STAGED WORKER OPTIMIZER..."
      );


      const startedAt =
        Date.now();


      const simulation =
        await runOptimizer(
          candles,

          optimizerSettings,

          {

            grid,

          }

        );


      const localElapsed =
        (
          Date.now() -
          startedAt
        ) /
        1000;


      // ==================================================
      // RESULTS
      // ==================================================

      const results =
        Array.isArray(
          simulation?.results
        )
          ? simulation.results
          : [];


      const totalCombinations =
        Number(
          simulation?.totalCombinations ??
          values.length
        );


      const completed =
        Number(
          simulation?.completed ??
          values.length
        );


      const elapsedSeconds =
        Number(
          simulation?.elapsedSeconds ??
          localElapsed
        );


      // ==================================================
      // LOG RESULTS
      // ==================================================

      console.log("");

      console.log(
        "=================================================="
      );

      console.log(
        "STAGED OPTIMIZATION COMPLETE"
      );

      console.log(
        "=================================================="
      );

      console.log(
        `Parameter:  ${parameter}`
      );

      console.log(
        `Tests:      ${completed}/${totalCombinations}`
      );

      console.log(
        `Returned:   ${results.length}`
      );

      console.log(
        `Time:       ${elapsedSeconds.toFixed(2)} seconds`
      );


      if (
        results.length > 0
      ) {

        console.log(
          "BEST RESULT:"
        );

        console.log(
          results[0]
        );

      }


      // ==================================================
      // RESPONSE
      // ==================================================

      res.json({

        success:
          true,

        staged:
          true,

        step:
          null,

        parameter,

        symbol:
          cleanSymbol,

        timeframe,

        days:
          simulationDays,

        from:
          Number(from),

        to:
          Number(to),

        stepSize:
          Number(step),

        testedValues:
          values.length,

        totalCombinations,

        completed,

        elapsedSeconds,

        results,

        selectedValues:
          selectedValues || {},

      });

    } catch (
      error
    ) {

      console.error("");

      console.error(
        "=================================================="
      );

      console.error(
        "STAGED OPTIMIZATION ERROR"
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
          "Staged optimization failed.",

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
      "Using Binance USDT-M Futures candles"
    );

    console.log(
      "Supported timeframes:",
      Object.keys(
        TIMEFRAME_MAP
      ).join(", ")
    );

    console.log(
      "Staged parameters:",
      Object.keys(
        PARAMETER_LIMITS
      ).join(", ")
    );

    console.log(
      "=================================================="
    );

  }
);

