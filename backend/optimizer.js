// ======================================================
// STRATEGY PARAMETER OPTIMIZER
//
// EMA + SMA + MACD + STOCHASTIC + KELTNER
//
// MULTI-CORE VERSION
//
// - Uses worker_threads
// - Keeps only TOP 300
// - Supports frontend ranges
// - Same API return format
// ======================================================

const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");

const os = require("os");

const {
  runBacktest,
} = require("./backtest");


// ======================================================
// DEFAULT SETTINGS
// ======================================================

const DEFAULT_SETTINGS = {

  balance: 100,

  emaLength: 200,
  smaLength: 25,

  source: "low",

  keltnerLength: 10,
  keltnerMultiplier: 2,

  atrLength: 15,

  stochasticLength: 10,
  stochasticSmoothing: 1,

  macdFast: 4,
  macdSlow: 34,
  macdSignal: 5,

  tpAtr: 15,
  slAtr: null,

  margin: 3,
  leverage: 10,

  roundTripFee: 0.04,

  cooldownBars: 0,

};


// ======================================================
// CONFIG
// ======================================================

const MAX_COMBINATIONS = 1_000_000;

const TOP_RESULTS = 300;

const DEFAULT_BATCH_SIZE = 100;


// ======================================================
// CREATE RANGE
// ======================================================

function createRange(
  from,
  to,
  step = 1
) {

  from = Number(from);
  to = Number(to);
  step = Number(step);


  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    !Number.isFinite(step) ||
    step <= 0
  ) {

    throw new Error(
      `Invalid range: ${from} -> ${to} step ${step}`
    );

  }


  if (to < from) {

    throw new Error(
      `Invalid range: ${from} -> ${to}`
    );

  }


  const values = [];


  for (
    let value = from;
    value <= to + step * 0.000001;
    value += step
  ) {

    values.push(
      Number(
        value.toFixed(10)
      )
    );

  }


  return values;

}


// ======================================================
// BUILD VALUES
// ======================================================

function buildValues(
  definition,
  fallback
) {

  if (
    definition === undefined ||
    definition === null
  ) {

    return [
      fallback
    ];

  }


  if (
    Array.isArray(
      definition.values
    )
  ) {

    return definition.values.length
      ? definition.values
      : [fallback];

  }


  if (
    definition.enabled === false
  ) {

    return [

      definition.value !== undefined
        ? definition.value
        : fallback

    ];

  }


  if (
    definition.enabled === true &&
    definition.from !== undefined &&
    definition.to !== undefined
  ) {

    return createRange(

      definition.from,

      definition.to,

      definition.step ?? 1

    );

  }


  if (
    definition.from !== undefined &&
    definition.to !== undefined
  ) {

    return createRange(

      definition.from,

      definition.to,

      definition.step ?? 1

    );

  }


  if (
    definition.value !== undefined
  ) {

    return [
      definition.value
    ];

  }


  return [
    fallback
  ];

}


// ======================================================
// BUILD GRID
// ======================================================

function buildGrid(
  simulation = {}
) {

  const base =
    simulation.baseSettings || {};

  const optimize =
    simulation.optimize || {};


  const defaults = {

    ...DEFAULT_SETTINGS,

    ...base,

  };


  return {

    emaLength:
      buildValues(
        optimize.emaLength,
        defaults.emaLength
      ),

    smaLength:
      buildValues(
        optimize.smaLength,
        defaults.smaLength
      ),

    source:
      buildValues(
        optimize.source,
        defaults.source
      ),

    keltnerLength:
      buildValues(
        optimize.keltnerLength,
        defaults.keltnerLength
      ),

    keltnerMultiplier:
      buildValues(
        optimize.keltnerMultiplier,
        defaults.keltnerMultiplier
      ),

    atrLength:
      buildValues(
        optimize.atrLength,
        defaults.atrLength
      ),

    stochasticLength:
      buildValues(
        optimize.stochasticLength,
        defaults.stochasticLength
      ),

    stochasticSmoothing:
      buildValues(
        optimize.stochastic,
        defaults.stochasticSmoothing
      ),

    macdFast:
      buildValues(
        optimize.macdFast,
        defaults.macdFast
      ),

    macdSlow:
      buildValues(
        optimize.macdSlow,
        defaults.macdSlow
      ),

    macdSignal:
      buildValues(
        optimize.macdSignal,
        defaults.macdSignal
      ),

    tpAtr:
      buildValues(
        optimize.tpAtr,
        defaults.tpAtr
      ),

    slAtr:
      buildValues(
        optimize.slAtr,
        defaults.slAtr
      ),

  };

}


// ======================================================
// COUNT
// ======================================================

function countCombinations(
  grid
) {

  return Object.values(
    grid
  ).reduce(
    (
      total,
      values
    ) =>
      total * values.length,
    1
  );

}


// ======================================================
// GENERATE COMBINATIONS
// ======================================================

function generateCombinations(
  grid
) {

  const keys =
    Object.keys(grid);

  const combinations = [];


  function recurse(
    index,
    current
  ) {

    if (
      index === keys.length
    ) {

      combinations.push({
        ...current,
      });

      return;

    }


    const key =
      keys[index];


    for (
      const value
      of grid[key]
    ) {

      current[key] =
        value;

      recurse(
        index + 1,
        current
      );

    }

  }


  recurse(
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
// COMPACT RESULT
// ======================================================

function compactResult(
  combination,
  result
) {

  return {

    ...combination,

    totalTrades:
      safeNumber(
        result.totalTrades
      ),

    winners:
      safeNumber(
        result.winners
      ),

    losers:
      safeNumber(
        result.losers
      ),

    breakeven:
      safeNumber(
        result.breakeven
      ),

    winRate:
      safeNumber(
        result.winRate
      ),

    netProfit:
      safeNumber(
        result.netProfit
      ),

    endingBalance:
      safeNumber(
        result.endingBalance
      ),

    profitFactor:
      result.profitFactor === Infinity
        ? Infinity
        : safeNumber(
            result.profitFactor
          ),

    maxDrawdown:
      safeNumber(
        result.maxDrawdown
      ),

    returnPercent:
      safeNumber(
        result.returnPercent
      ),

    averageTrade:
      safeNumber(
        result.averageTrade
      ),

  };

}


// ======================================================
// SCORE
//
// Profit is dominant.
// Trade count adds secondary preference.
// ======================================================

function calculateScore(
  result
) {

  const profit =
    safeNumber(
      result.netProfit
    );

  const trades =
    safeNumber(
      result.totalTrades
    );


  const tradeFactor =
    trades /
    (
      trades + 25
    );


  return (

    profit * 0.70

  ) + (

    profit *
    tradeFactor *
    0.30

  );

}


// ======================================================
// KEEP TOP 300
// ======================================================

function addTopResult(
  topResults,
  result
) {

  result.optimizationScore =
    calculateScore(
      result
    );


  topResults.push(
    result
  );


  if (
    topResults.length >
    TOP_RESULTS
  ) {

    // Remove the weakest result.
    topResults.sort(
      (
        a,
        b
      ) =>
        b.optimizationScore -
        a.optimizationScore
    );


    topResults.length =
      TOP_RESULTS;

  }

}


// ======================================================
// SORT
// ======================================================

function sortResults(
  results
) {

  results.sort(
    (
      a,
      b
    ) =>

      Number(
        b.optimizationScore
      ) -

      Number(
        a.optimizationScore
      )

  );


  results.forEach(
    (
      result,
      index
    ) => {

      result.rank =
        index + 1;

    }
  );


  return results;

}


// ======================================================
// WORKER MODE
// ======================================================

function workerMain() {

  const {
    candles,
    settings,
  } = workerData;


  parentPort.on(
    "message",
    (
      message
    ) => {

      if (
        message.type !== "run"
      ) {

        return;

      }


      const results = [];

      let failed = 0;


      for (
        const combination
        of message.combinations
      ) {

        const params = {

          ...DEFAULT_SETTINGS,

          ...settings,

          ...combination,

        };


        try {

          const result =
            runBacktest(
              candles,
              params
            );


          results.push(
            compactResult(
              combination,
              result
            )
          );


        } catch (
          error
        ) {

          failed++;

        }

      }


      parentPort.postMessage({

        type: "done",

        taskId:
          message.taskId,

        results,

        completed:
          message.combinations.length,

        failed,

      });

    }
  );

}


// ======================================================
// MAIN THREAD OPTIMIZER
// ======================================================

function runOptimizerParallel(
  candles,
  settings,
  grid,
  options = {}
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const start =
        Date.now();


      // ==================================================
      // GENERATE COMBINATIONS
      // ==================================================

      const combinations =
        generateCombinations(
          grid
        );


      const total =
        combinations.length;


      if (
        total === 0
      ) {

        reject(
          new Error(
            "No combinations generated."
          )
        );

        return;

      }


      if (
        total >
        MAX_COMBINATIONS
      ) {

        reject(
          new Error(
            `Too many combinations: ` +
            `${total.toLocaleString()}. ` +
            `Maximum: ` +
            `${MAX_COMBINATIONS.toLocaleString()}.`
          )
        );

        return;

      }


      // ==================================================
      // CPU
      // ==================================================

      const cpuCount =
        typeof os.availableParallelism ===
        "function"

          ? os.availableParallelism()

          : os.cpus().length;


      const requested =
        Number(
          options.workers
        );


      const workersCount =
        Math.max(

          1,

          Math.min(

            Number.isFinite(requested)

              ? requested

              : Math.max(
                  1,
                  cpuCount - 1
                ),

            cpuCount,

            total

          )

        );


      const batchSize =
        Math.max(

          1,

          Number(
            options.batchSize ||
            DEFAULT_BATCH_SIZE
          )

        );


      console.log("");

      console.log(
        "=================================================="
      );

      console.log(
        "MULTI-CORE OPTIMIZATION"
      );

      console.log(
        "=================================================="
      );

      console.log(
        `Combinations: ${total}`
      );

      console.log(
        `CPU cores:   ${cpuCount}`
      );

      console.log(
        `Workers:     ${workersCount}`
      );

      console.log(
        `Batch size:  ${batchSize}`
      );

      console.log(
        `Top stored:  ${TOP_RESULTS}`
      );


      // ==================================================
      // CREATE BATCHES
      // ==================================================

      const batches = [];


      for (
        let i = 0;
        i < combinations.length;
        i += batchSize
      ) {

        batches.push(
          combinations.slice(
            i,
            i + batchSize
          )
        );

      }


      let nextBatch =
        0;

      let completed =
        0;

      let failed =
        0;

      let finishedWorkers =
        0;

      let settled =
        false;


      const topResults = [];


      const workers = [];


      // ==================================================
      // CLEANUP
      // ==================================================

      function cleanup() {

        for (
          const worker
          of workers
        ) {

          worker.terminate()
            .catch(
              () => {}
            );

        }

      }


      // ==================================================
      // FINISH
      // ==================================================

      function finish() {

        if (
          settled
        ) {

          return;

        }


        settled = true;


        const elapsedSeconds =
          (
            Date.now() -
            start
          ) / 1000;


        sortResults(
          topResults
        );


        console.log("");

        console.log(
          "=================================================="
        );

        console.log(
          "OPTIMIZATION COMPLETE"
        );

        console.log(
          "=================================================="
        );

        console.log(
          `Completed: ${completed}/${total}`
        );

        console.log(
          `Failed:    ${failed}`
        );

        console.log(
          `Time:      ${elapsedSeconds.toFixed(2)} seconds`
        );

        console.log(
          `Stored:    ${topResults.length}`
        );


        cleanup();


        resolve({

          totalCombinations:
            total,

          completed,

          elapsedSeconds,

          results:
            topResults,

        });

      }


      // ==================================================
      // FAIL
      // ==================================================

      function fail(
        error
      ) {

        if (
          settled
        ) {

          return;

        }


        settled = true;


        cleanup();


        reject(
          error
        );

      }


      // ==================================================
      // GET NEXT BATCH
      // ==================================================

      function getNextBatch() {

        if (
          nextBatch >=
          batches.length
        ) {

          return null;

        }


        const batch =
          batches[nextBatch];


        nextBatch++;


        return batch;

      }


      // ==================================================
      // START WORKER
      // ==================================================

      function startWorker() {

        if (
          settled
        ) {

          return;

        }


        const worker =
          new Worker(
            __filename,
            {

              workerData: {

                candles,

                settings,

              },

            }
          );


        workers.push(
          worker
        );


        // ----------------------------------------------
        // SEND WORK
        // ----------------------------------------------

        function sendNext() {

          const batch =
            getNextBatch();


          if (
            !batch
          ) {

            worker.postMessage({
              type: "stop",
            });

            return;

          }


          const taskId =
            nextBatch;


          worker.postMessage({

            type: "run",

            taskId,

            combinations:
              batch,

          });

        }


        // ----------------------------------------------
        // MESSAGE
        // ----------------------------------------------

        worker.on(
          "message",
          (
            message
          ) => {

            if (
              settled
            ) {

              return;

            }


            if (
              message.type !== "done"
            ) {

              return;

            }


            completed +=
              Number(
                message.completed ||
                0
              );


            failed +=
              Number(
                message.failed ||
                0
              );


            for (
              const result
              of message.results || []
            ) {

              addTopResult(
                topResults,
                result
              );

            }


            // ------------------------------------------
            // Progress
            // ------------------------------------------

            const elapsed =
              (
                Date.now() -
                start
              ) / 1000;


            const testsPerSecond =
              completed /
              Math.max(
                elapsed,
                0.001
              );


            const progress =
              (
                completed /
                total
              ) * 100;


            console.log(

              `Progress: ` +

              `${completed}/${total} | ` +

              `${progress.toFixed(1)}% | ` +

              `${testsPerSecond.toFixed(0)} tests/sec`

            );


            // ------------------------------------------
            // ALL COMBINATIONS FINISHED
            // ------------------------------------------

            if (
              completed >=
              total
            ) {

              finish();

              return;

            }


            // ------------------------------------------
            // MORE WORK
            // ------------------------------------------

            sendNext();

          }
        );


        // ----------------------------------------------
        // ERROR
        // ----------------------------------------------

        worker.on(
          "error",
          (
            error
          ) => {

            fail(
              error
            );

          }
        );


        // ----------------------------------------------
        // EXIT
        // ----------------------------------------------

        worker.on(
          "exit",
          (
            code
          ) => {

            if (
              settled
            ) {

              return;

            }


            if (
              code !== 0
            ) {

              fail(
                new Error(
                  `Worker exited with code ${code}.`
                )
              );

              return;

            }


            finishedWorkers++;


            if (
              finishedWorkers ===
              workersCount &&
              completed >=
              total
            ) {

              finish();

            }

          }
        );


        // ----------------------------------------------
        // FIRST BATCH
        // ----------------------------------------------

        sendNext();

      }


      // ==================================================
      // START ALL WORKERS
      // ==================================================

      try {

        for (
          let i = 0;
          i < workersCount;
          i++
        ) {

          startWorker();

        }

      } catch (
        error
      ) {

        fail(
          error
        );

      }

    }
  );

}


// ======================================================
// PUBLIC RUN OPTIMIZER
// ======================================================

async function runOptimizer(
  candles,
  settings = {},
  options = {}
) {

  if (
    !Array.isArray(candles) ||
    candles.length === 0
  ) {

    throw new Error(
      "No candles provided."
    );

  }


  // ====================================================
  // BUILD GRID
  // ====================================================

  let grid;


  if (
    options &&
    options.grid
  ) {

    grid =
      options.grid;

  } else if (
    options &&
    options.simulation
  ) {

    grid =
      buildGrid(
        options.simulation
      );

  } else {

    grid = {

      emaLength: [
        settings.emaLength ??
        DEFAULT_SETTINGS.emaLength
      ],

      smaLength: [
        settings.smaLength ??
        DEFAULT_SETTINGS.smaLength
      ],

      source: [
        settings.source ??
        DEFAULT_SETTINGS.source
      ],

      keltnerLength: [
        settings.keltnerLength ??
        DEFAULT_SETTINGS.keltnerLength
      ],

      keltnerMultiplier: [
        settings.keltnerMultiplier ??
        DEFAULT_SETTINGS.keltnerMultiplier
      ],

      atrLength: [
        settings.atrLength ??
        DEFAULT_SETTINGS.atrLength
      ],

      stochasticLength: [
        settings.stochasticLength ??
        DEFAULT_SETTINGS.stochasticLength
      ],

      stochasticSmoothing: [
        settings.stochasticSmoothing ??
        DEFAULT_SETTINGS.stochasticSmoothing
      ],

      macdFast: [
        settings.macdFast ??
        DEFAULT_SETTINGS.macdFast
      ],

      macdSlow: [
        settings.macdSlow ??
        DEFAULT_SETTINGS.macdSlow
      ],

      macdSignal: [
        settings.macdSignal ??
        DEFAULT_SETTINGS.macdSignal
      ],

      tpAtr: [
        settings.tpAtr ??
        DEFAULT_SETTINGS.tpAtr
      ],

      slAtr: [
        settings.slAtr ??
        DEFAULT_SETTINGS.slAtr
      ],

    };

  }


  // ====================================================
  // VALIDATE GRID
  // ====================================================

  for (
    const key
    of Object.keys(grid)
  ) {

    if (
      !Array.isArray(grid[key]) ||
      grid[key].length === 0
    ) {

      throw new Error(
        `Invalid optimizer grid for ${key}.`
      );

    }

  }


  // ====================================================
  // RUN
  // ====================================================

  const simulation =
    await runOptimizerParallel(

      candles,

      settings,

      grid,

      options

    );


  // ====================================================
  // TOP 10 CONSOLE
  // ====================================================

  console.log("");

  console.log(
    "================ TOP 10 RESULTS ================="
  );


  simulation.results
    .slice(
      0,
      10
    )
    .forEach(
      (
        result,
        index
      ) => {

        console.log("");

        console.log(
          `#${index + 1}`
        );

        console.log(
          `Score:          ${safeNumber(
            result.optimizationScore
          ).toFixed(4)}`
        );

        console.log(
          `EMA:            ${result.emaLength}`
        );

        console.log(
          `SMA:            ${result.smaLength}`
        );

        console.log(
          `Source:         ${result.source}`
        );

        console.log(
          `KC:             ${result.keltnerLength}/${result.keltnerMultiplier}`
        );

        console.log(
          `ATR:            ${result.atrLength}`
        );

        console.log(
          `Stoch:          ${result.stochasticSmoothing}`
        );

        console.log(
          `MACD:           ${result.macdFast}/${result.macdSlow}/${result.macdSignal}`
        );

        console.log(
          `TP:             ${result.tpAtr}`
        );

        console.log(
          `SL:             ${
            result.slAtr === null ||
            result.slAtr === undefined
              ? "NONE"
              : result.slAtr
          }`
        );

        console.log(
          `Trades:         ${result.totalTrades}`
        );

        console.log(
          `Win Rate:       ${safeNumber(
            result.winRate
          ).toFixed(2)}%`
        );

        console.log(
          `Net Profit:     $${safeNumber(
            result.netProfit
          ).toFixed(4)}`
        );

        console.log(
          `Profit Factor:  ${
            result.profitFactor === Infinity
              ? "∞"
              : safeNumber(
                  result.profitFactor
                ).toFixed(4)
          }`
        );

        console.log(
          `Drawdown:       ${safeNumber(
            result.maxDrawdown
          ).toFixed(4)}%`
        );

      }
    );


  // ====================================================
  // SAME API FORMAT
  // ====================================================

  return {

    totalCombinations:
      simulation.totalCombinations,

    completed:
      simulation.completed,

    elapsedSeconds:
      simulation.elapsedSeconds,

    results:
      simulation.results,

  };

}


// ======================================================
// WORKER ENTRY
// ======================================================

if (
  !isMainThread
) {

  workerMain();

}


// ======================================================
// EXPORTS
// ======================================================

if (
  isMainThread
) {

  module.exports = {

    DEFAULT_SETTINGS,

    createRange,

    buildValues,

    buildGrid,

    countCombinations,

    generateCombinations,

    runOptimizer,

  };

}