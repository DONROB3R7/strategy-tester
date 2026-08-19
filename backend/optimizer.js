// ======================================================
// STRATEGY PARAMETER OPTIMIZER
//
// Fetch candles once.
// Run parameter combinations locally.
//
// Current grid:
//
// EMA:           100, 150, 200, 250, 300
// SMA:           20, 25, 30, 40, 50
// KC length:     5, 10, 15, 20
// KC multiplier: 1.5, 2, 2.5
// ATR length:    10, 15, 20
// TP ATR:        5, 10, 15, 20
// SL ATR:        null
//
// Total:
// 5 × 5 × 4 × 3 × 3 × 4
// = 18,000 combinations
// ======================================================

const {
  runStrategy,
} = require("./strategy/strategy");


// ======================================================
// PARAMETER GRID
// ======================================================

const PARAM_GRID = {
  emaLength: [150, 200, 300],

  smaLength: [20, 25, 30],

  source: [
    "open",
    "high",
    "low",
    "close",
  ],

  keltnerLength: [10, 15, 20],

  keltnerMultiplier: [1, 2, 3],

  atrLength: [10, 15, 20],

  stochasticSmoothing: [1, 2, 3],

  macdFast: [2, 4, 5, 6],

  macdSlow: [20, 34],

  tpAtr: [5, 10, 15, 20],
};

// ======================================================
// COUNT COMBINATIONS
// ======================================================

function countCombinations(grid) {

  return Object.values(grid).reduce(

    (
      total,
      values
    ) =>
      total *
      values.length,

    1

  );

}


// ======================================================
// GENERATE COMBINATIONS
// ======================================================

function generateCombinations(grid) {

  const keys =
    Object.keys(grid);

  const combinations = [];


  function build(
    index,
    current
  ) {

    if (
      index ===
      keys.length
    ) {

      combinations.push({
        ...current,
      });

      return;
    }


    const key =
      keys[index];


    for (
      const value of grid[key]
    ) {

      current[key] =
        value;


      build(
        index + 1,
        current
      );

    }

  }


  build(
    0,
    {}
  );


  return combinations;

}


// ======================================================
// SAFE NUMBER
// ======================================================

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


// ======================================================
// SCORE
// ======================================================
//
// Currently ranked by net profit.
//
// We will improve this later after validating
// multiple coins and more historical data.
//
// ======================================================

function scoreResult(result) {

  return safeNumber(
    result.netProfit,
    -Infinity
  );

}


// ======================================================
// OPTIMIZER
// ======================================================

function runOptimizer(
  candles,
  baseSettings = {},
  options = {}
) {

  if (
    !Array.isArray(candles) ||
    candles.length === 0
  ) {

    throw new Error(
      "Optimizer received no candles."
    );

  }


  // ----------------------------------------------------
  // GRID
  // ----------------------------------------------------

  const grid =
    options.grid ||
    PARAM_GRID;


  // ----------------------------------------------------
  // GENERATE COMBINATIONS
  // ----------------------------------------------------

  const combinations =
    generateCombinations(
      grid
    );


  const total =
    combinations.length;


  console.log(
    `Starting optimization: ${total.toLocaleString()} combinations`
  );


  const results = [];


  const startTime =
    Date.now();


  // ====================================================
  // TEST EVERY COMBINATION
  // ====================================================

  for (
    let i = 0;
    i < total;
    i++
  ) {

    const combination =
      combinations[i];


    const settings = {

      ...baseSettings,

      ...combination,

    };


    let result;


    try {

      result =
        runStrategy(
          candles,
          settings
        );

    } catch (error) {

      console.error(

        `Combination ${i + 1} failed:`,

        error.message

      );

      continue;

    }


    // --------------------------------------------------
    // STORE RESULT
    // --------------------------------------------------

    results.push({

      rank: 0,

      ...combination,


      totalTrades:
        result.totalTrades,


      winners:
        result.winners,


      losers:
        result.losers,


      breakeven:
        result.breakeven,


      winRate:
        result.winRate,


      netProfit:
        result.netProfit,


      endingBalance:
        result.endingBalance,


      profitFactor:
        result.profitFactor,


      maxDrawdown:
        result.maxDrawdown,


      returnPercent:
        result.returnPercent,


      averageTrade:
        result.averageTrade,

    });


    // --------------------------------------------------
    // PROGRESS
    // --------------------------------------------------

    if (

      (i + 1) % 1000 === 0 ||

      i === total - 1

    ) {

      const elapsed =

        (
          Date.now() -
          startTime
        ) / 1000;


      const perSecond =

        (i + 1) /
        Math.max(
          elapsed,
          0.001
        );


      const remaining =

        (
          total -
          (i + 1)
        ) /
        Math.max(
          perSecond,
          0.001
        );


      console.log(

        `Progress: ${
          i + 1
        }/${total} | ` +

        `${(
          ((i + 1) /
            total) *
          100
        ).toFixed(1)}% | ` +

        `${perSecond.toFixed(
          0
        )} tests/sec | ` +

        `~${remaining.toFixed(
          1
        )}s remaining`

      );

    }

  }


  // ====================================================
  // SORT
  // ====================================================

  results.sort(

    (
      a,
      b
    ) =>

      scoreResult(b) -
      scoreResult(a)

  );


  // ====================================================
  // ADD RANK
  // ====================================================

  results.forEach(

    (
      result,
      index
    ) => {

      result.rank =
        index + 1;

    }

  );


  // ====================================================
  // TIME
  // ====================================================

  const elapsedSeconds =

    (
      Date.now() -
      startTime
    ) / 1000;


  console.log(

    `Optimization finished in ${elapsedSeconds.toFixed(
      2
    )} seconds`

  );


  // ====================================================
  // RETURN
  // ====================================================

  return {

    totalCombinations:
      total,

    completed:
      results.length,

    elapsedSeconds,

    results,

  };

}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  PARAM_GRID,

  countCombinations,

  generateCombinations,

  runOptimizer,

};
