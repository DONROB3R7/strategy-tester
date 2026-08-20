import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:3001";


// ============================================================
// APP
// ============================================================

function App() {

  const [activeTab, setActiveTab] =
    useState("simulation");


  // ==========================================================
  // RESULT TABLE SORT
  // ==========================================================

  const [resultSort, setResultSort] = useState({
    field: "totalTrades",
    direction: "desc",
  });


  // ==========================================================
  // SIMULATION SETTINGS
  // ==========================================================

  const [simulationSettings, setSimulationSettings] =
    useState({

      symbol: "1000BONKUSDT",

      timeframe: "15m",

      days: 30,

      baseSettings: {

        balance: 100,

        source: "low",

        // Pine defaults
        emaLength: 200,
        smaLength: 25,

        keltnerLength: 10,
        keltnerMultiplier: 2,

        atrLength: 15,

        stochasticLength: 10,
        stochasticSmoothing: 1,

        macdFast: 4,
        macdSlow: 34,
        macdSignal: 5,

        tpAtr: 15,
        slAtr: 3,

        margin: 3,
        leverage: 10,

        roundTripFee: 0.04,

        cooldownBars: 0,

      },


      // ======================================================
      // OPTIMIZATION
      // ======================================================

      optimize: {

        emaLength: {
          enabled: true,
          from: 180,
          to: 350,
          step: 1,
        },

        smaLength: {
          enabled: false,
          value: 25,
        },

        keltnerLength: {
          enabled: false,
          value: 10,
        },

        keltnerMultiplier: {
          enabled: false,
          value: 2,
        },

        atrLength: {
          enabled: false,
          value: 15,
        },

        // NEW
        stochasticLength: {
          enabled: false,
          value: 10,
        },

        stochastic: {
          enabled: false,
          value: 1,
        },

        macdFast: {
          enabled: false,
          value: 4,
        },

        macdSlow: {
          enabled: false,
          value: 34,
        },

        macdSignal: {
          enabled: false,
          value: 5,
        },

        tpAtr: {
          enabled: false,
          value: 15,
        },

        slAtr: {
          enabled: false,
          value: 3,
        },

      },

    });


  const [simulationResults, setSimulationResults] =
    useState(null);

  const [simulationLoading, setSimulationLoading] =
    useState(false);

  const [simulationError, setSimulationError] =
    useState(null);

  const [simulationElapsed, setSimulationElapsed] =
    useState(0);


  // ==========================================================
  // DEBUG
  // ==========================================================

  useEffect(() => {

    console.log(
      "=================================================="
    );

    console.log(
      "CURRENT SIMULATION STATE"
    );

    console.log(
      "=================================================="
    );

    console.log(
      "Symbol:",
      simulationSettings.symbol
    );

    console.log(
      "Timeframe:",
      simulationSettings.timeframe
    );

    console.log(
      "Days:",
      simulationSettings.days
    );

    console.log(
      "BASE SETTINGS:",
      simulationSettings.baseSettings
    );

    console.log(
      "OPTIMIZE SETTINGS:",
      simulationSettings.optimize
    );

    console.log(
      "Estimated combinations:",
      calculateCombinationCount()
    );

    console.log(
      "=================================================="
    );

  }, [simulationSettings]);


  // ==========================================================
  // TIMER
  // ==========================================================

  useEffect(() => {

    if (!simulationLoading) {
      return;
    }


    const interval =
      setInterval(() => {

        setSimulationElapsed(
          value => value + 1
        );

      }, 1000);


    return () =>
      clearInterval(interval);

  }, [simulationLoading]);


  // ==========================================================
  // UPDATE BASE
  // ==========================================================

  function updateBaseSetting(
    name,
    value
  ) {

    console.log(
      "BASE SETTING CHANGED:",
      name,
      value
    );


    setSimulationSettings(
      previous => ({

        ...previous,

        baseSettings: {

          ...previous.baseSettings,

          [name]:
            value,

        },

      })
    );

  }


  // ==========================================================
  // UPDATE OPTIMIZER
  // ==========================================================

  function updateOptimizerSetting(
    name,
    field,
    value
  ) {

    console.log(
      "OPTIMIZER SETTING CHANGED:",
      {
        name,
        field,
        value,
      }
    );


    setSimulationSettings(
      previous => {

        if (
          !previous.optimize[name]
        ) {

          console.error(
            "Unknown optimizer parameter:",
            name
          );

          console.error(
            "Available parameters:",
            Object.keys(
              previous.optimize
            )
          );

          return previous;

        }


        const updatedOptimize = {

          ...previous.optimize,

          [name]: {

            ...previous.optimize[name],

            [field]:
              value,

          },

        };


        console.log(
          "NEW OPTIMIZE:",
          JSON.stringify(
            updatedOptimize,
            null,
            2
          )
        );


        return {

          ...previous,

          optimize:
            updatedOptimize,

        };

      }
    );

  }


  // ==========================================================
  // DEFAULT TEST
  // ==========================================================

  function loadDefaultTest() {

    const defaultOptimize = {

      emaLength: {
        enabled: true,
        from: 180,
        to: 200,
        step: 10,
      },

      smaLength: {
        enabled: true,
        from: 23,
        to: 27,
        step: 2,
      },

      keltnerLength: {
        enabled: true,
        from: 8,
        to: 12,
        step: 2,
      },

      keltnerMultiplier: {
        enabled: true,
        from: 1.8,
        to: 2.2,
        step: 0.2,
      },

      atrLength: {
        enabled: true,
        from: 13,
        to: 17,
        step: 2,
      },

      stochasticLength: {
        enabled: true,
        from: 8,
        to: 12,
        step: 2,
      },

      stochastic: {
        enabled: true,
        from: 1,
        to: 3,
        step: 1,
      },

      macdFast: {
        enabled: true,
        from: 2,
        to: 6,
        step: 2,
      },

      macdSlow: {
        enabled: true,
        from: 32,
        to: 36,
        step: 2,
      },

      macdSignal: {
        enabled: true,
        from: 4,
        to: 6,
        step: 1,
      },

      tpAtr: {
        enabled: true,
        from: 13,
        to: 17,
        step: 2,
      },

      slAtr: {
        enabled: true,
        from: 2,
        to: 4,
        step: 1,
      },

    };


    setSimulationSettings(
      previous => ({

        ...previous,

        optimize:
          defaultOptimize,

      })
    );


    console.log(
      "DEFAULT TEST LOADED"
    );

    console.log(
      JSON.stringify(
        defaultOptimize,
        null,
        2
      )
    );

  }


  // ==========================================================
  // COMBINATION COUNT
  // ==========================================================

  function calculateCombinationCount() {

    const optimize =
      simulationSettings.optimize;


    function countValues(
      setting
    ) {

      if (!setting) {
        return 1;
      }


      if (
        setting.enabled !== true
      ) {

        return 1;

      }


      const from =
        Number(
          setting.from
        );


      const to =
        Number(
          setting.to
        );


      const step =
        Number(
          setting.step
        );


      if (
        !Number.isFinite(from) ||
        !Number.isFinite(to) ||
        !Number.isFinite(step) ||
        step <= 0 ||
        to < from
      ) {

        return 1;

      }


      return (
        Math.floor(
          (
            to -
            from
          ) /
          step
        ) + 1
      );

    }


    return (

      countValues(
        optimize.emaLength
      ) *

      countValues(
        optimize.smaLength
      ) *

      countValues(
        optimize.keltnerLength
      ) *

      countValues(
        optimize.keltnerMultiplier
      ) *

      countValues(
        optimize.atrLength
      ) *

      countValues(
        optimize.stochasticLength
      ) *

      countValues(
        optimize.stochastic
      ) *

      countValues(
        optimize.macdFast
      ) *

      countValues(
        optimize.macdSlow
      ) *

      countValues(
        optimize.macdSignal
      ) *

      countValues(
        optimize.tpAtr
      ) *

      countValues(
        optimize.slAtr
      )

    );

  }


  // ==========================================================
  // RESULT SORT
  // ==========================================================

  function handleResultSort(
    field
  ) {

    setResultSort(
      previous => {

        if (
          previous.field === field
        ) {

          return {

            field,

            direction:
              previous.direction === "desc"
                ? "asc"
                : "desc",

          };

        }


        return {

          field,

          direction:
            "desc",

        };

      }
    );

  }


  // ==========================================================
  // SORT RESULTS
  // ==========================================================

  function sortResults(
    results
  ) {

    if (
      !Array.isArray(
        results
      )
    ) {

      return [];

    }


    return [
      ...results
    ].sort(
      (
        a,
        b
      ) => {

        let aValue =
          a?.[
            resultSort.field
          ];


        let bValue =
          b?.[
            resultSort.field
          ];


        if (
          aValue === null ||
          aValue === undefined
        ) {

          aValue = 0;

        }


        if (
          bValue === null ||
          bValue === undefined
        ) {

          bValue = 0;

        }


        const aNumber =
          Number(
            aValue
          );


        const bNumber =
          Number(
            bValue
          );


        if (
          Number.isFinite(
            aNumber
          ) &&
          Number.isFinite(
            bNumber
          )
        ) {

          return (
            resultSort.direction === "asc"
              ? aNumber - bNumber
              : bNumber - aNumber
          );

        }


        const comparison =
          String(
            aValue
          ).localeCompare(
            String(
              bValue
            )
          );


        return (
          resultSort.direction === "asc"
            ? comparison
            : -comparison
        );

      }
    );

  }


  // ==========================================================
  // RUN SIMULATION
  // ==========================================================

  async function runSimulation() {

    try {

      setSimulationLoading(
        true
      );

      setSimulationResults(
        null
      );

      setSimulationError(
        null
      );

      setSimulationElapsed(
        0
      );


      const payload = {

        symbol:
          simulationSettings.symbol
            .trim()
            .toUpperCase(),

        timeframe:
          simulationSettings.timeframe,

        days:
          Number(
            simulationSettings.days
          ),

        baseSettings:
          simulationSettings.baseSettings,

        optimization:
          simulationSettings.optimize,

      };


      console.log("");

      console.log(
        "=================================================="
      );

      console.log(
        "SIMULATION START"
      );

      console.log(
        "=================================================="
      );

      console.log(
        "Estimated combinations:",
        calculateCombinationCount()
      );

      console.log(
        "PAYLOAD:",
        JSON.stringify(
          payload,
          null,
          2
        )
      );


      if (
        !payload.optimization ||
        typeof payload.optimization !==
          "object"
      ) {

        throw new Error(
          "Optimization settings are missing."
        );

      }


      const response =
        await fetch(
          `${API_URL}/api/simulate`,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

            },

            body:
              JSON.stringify(
                payload
              ),

          }
        );


      const contentType =
        response.headers.get(
          "content-type"
        ) || "";


      if (
        !contentType.includes(
          "application/json"
        )
      ) {

        const text =
          await response.text();


        throw new Error(
          `API returned non-JSON response (${response.status}). ` +
          `Response: ${text.slice(
            0,
            300
          )}`
        );

      }


      const data =
        await response.json();


      console.log(
        "SIMULATION RESPONSE:",
        data
      );


      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.error ||
          "Simulation failed."
        );

      }


      if (
        !Array.isArray(
          data.results
        )
      ) {

        throw new Error(
          "Backend returned invalid results."
        );

      }


      console.log(
        "Total combinations:",
        data.totalCombinations
      );

      console.log(
        "Completed:",
        data.completed
      );

      console.log(
        "Returned:",
        data.results.length
      );


      setSimulationResults(
        data
      );

    } catch (
      error
    ) {

      console.error(
        "SIMULATION ERROR:",
        error
      );


      setSimulationError(
        error.message
      );

    } finally {

      setSimulationLoading(
        false
      );

    }

  }


  // ==========================================================
  // FORMATTERS
  // ==========================================================

  function formatMoney(
    value
  ) {

    const number =
      Number(
        value
      );


    if (
      !Number.isFinite(
        number
      )
    ) {

      return "$0.0000";

    }


    const sign =
      number > 0
        ? "+"
        : "";


    return (
      `${sign}$${number.toFixed(
        4
      )}`
    );

  }


  function formatNumber(
    value,
    decimals = 2
  ) {

    const number =
      Number(
        value
      );


    if (
      !Number.isFinite(
        number
      )
    ) {

      return "-";

    }


    return number.toFixed(
      decimals
    );

  }


  function formatPercent(
    value
  ) {

    const number =
      Number(
        value
      );


    if (
      !Number.isFinite(
        number
      )
    ) {

      return "-";

    }


    return (
      `${number.toFixed(
        2
      )}%`
    );

  }


  function getProfitFactor(
    value
  ) {

    if (
      value === Infinity ||
      value === "Infinity"
    ) {

      return "∞";

    }


    return formatNumber(
      value,
      2
    );

  }


  function formatElapsed(
    seconds
  ) {

    const minutes =
      Math.floor(
        seconds / 60
      );


    const secs =
      seconds % 60;


    return (
      `${String(
        minutes
      ).padStart(
        2,
        "0"
      )}:` +

      `${String(
        secs
      ).padStart(
        2,
        "0"
      )}`
    );

  }


  // ==========================================================
  // TOP 300
  // ==========================================================

  const topResults =
    useMemo(() => {

      if (
        !simulationResults ||
        !Array.isArray(
          simulationResults.results
        )
      ) {

        return [];

      }


      return sortResults(
        simulationResults.results
      ).slice(
        0,
        300
      );

    }, [
      simulationResults,
      resultSort,
    ]);


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="app-page">

      <header className="app-header">

        <div>

          <h1>
            Strategy Tester
          </h1>

          <p>
            EMA + SMA + MACD +
            Stochastic + Keltner
          </p>

        </div>


        <div className="api-badge">

          API:
          {" "}
          {API_URL}

        </div>

      </header>


      <div className="tabs">

        <button
          className={
            activeTab === "simulation"
              ? "tab-button active"
              : "tab-button"
          }
          onClick={
            () =>
              setActiveTab(
                "simulation"
              )
          }
        >
          Simulation
        </button>

      </div>


      {activeTab === "simulation" && (

        <>

          <section className="panel">

            <h2>
              Simulation
            </h2>

            <p className="muted">

              Optimize only the parameters
              you select.

            </p>


            {/* ==================================================
                MARKET
            ================================================== */}

            <h3 className="section-title">
              Market
            </h3>


            <div className="form-grid">

              <Field
                label="Coin"
                value={
                  simulationSettings.symbol
                }
                onChange={
                  event =>
                    setSimulationSettings(
                      previous => ({

                        ...previous,

                        symbol:
                          event.target.value,

                      })
                    )
                }
                type="text"
              />


              <Field
                label="Timeframe"
                value={
                  simulationSettings.timeframe
                }
                onChange={
                  event =>
                    setSimulationSettings(
                      previous => ({

                        ...previous,

                        timeframe:
                          event.target.value,

                      })
                    )
                }
                type="select"
                options={[
                  "1m",
                  "5m",
                  "15m",
                  "30m",
                  "1H",
                  "4H",
                  "12H",
                  "1D",
                ]}
              />


              <Field
                label="Days"
                value={
                  simulationSettings.days
                }
                onChange={
                  event =>
                    setSimulationSettings(
                      previous => ({

                        ...previous,

                        days:
                          Number(
                            event.target.value
                          ),

                      })
                    )
                }
                type="number"
                min="1"
              />

            </div>


            {/* ==================================================
                OPTIMIZE
            ================================================== */}

            <h3 className="section-title">
              Optimize
            </h3>


            <div className="optimization-list">

              <RangeOptimizer
                label="EMA"
                name="emaLength"
                setting={
                  simulationSettings
                    .optimize
                    .emaLength
                }
                onChange={
                  updateOptimizerSetting
                }
                integer
              />


              <RangeOptimizer
                label="SMA"
                name="smaLength"
                setting={
                  simulationSettings
                    .optimize
                    .smaLength
                }
                onChange={
                  updateOptimizerSetting
                }
                integer
              />


              <RangeOptimizer
                label="KC Length"
                name="keltnerLength"
                setting={
                  simulationSettings
                    .optimize
                    .keltnerLength
                }
                onChange={
                  updateOptimizerSetting
                }
                integer
              />


              <RangeOptimizer
                label="KC Mult"
                name="keltnerMultiplier"
                setting={
                  simulationSettings
                    .optimize
                    .keltnerMultiplier
                }
                onChange={
                  updateOptimizerSetting
                }
              />


              <RangeOptimizer
                label="ATR"
                name="atrLength"
                setting={
                  simulationSettings
                    .optimize
                    .atrLength
                }
                onChange={
                  updateOptimizerSetting
                }
                integer
              />


              {/* NEW STOCH LENGTH */}

              <RangeOptimizer
                label="Stoch Length"
                name="stochasticLength"
                setting={
                  simulationSettings
                    .optimize
                    .stochasticLength
                }
                onChange={
                  updateOptimizerSetting
                }
                integer
              />


              {/* STOCH SMOOTHING */}

              <RangeOptimizer
                label="Stoch Smooth"
                name="stochastic"
                setting={
                  simulationSettings
                    .optimize
                    .stochastic
                }
                onChange={
                  updateOptimizerSetting
                }
                integer
              />


              <RangeOptimizer
                label="MACD Fast"
                name="macdFast"
                setting={
                  simulationSettings
                    .optimize
                    .macdFast
                }
                onChange={
                  updateOptimizerSetting
                }
                integer
              />


              <RangeOptimizer
                label="MACD Slow"
                name="macdSlow"
                setting={
                  simulationSettings
                    .optimize
                    .macdSlow
                }
                onChange={
                  updateOptimizerSetting
                }
                integer
              />


              <RangeOptimizer
                label="MACD Signal"
                name="macdSignal"
                setting={
                  simulationSettings
                    .optimize
                    .macdSignal
                }
                onChange={
                  updateOptimizerSetting
                }
                integer
              />


              <RangeOptimizer
                label="TP"
                name="tpAtr"
                setting={
                  simulationSettings
                    .optimize
                    .tpAtr
                }
                onChange={
                  updateOptimizerSetting
                }
              />


              <RangeOptimizer
                label="SL"
                name="slAtr"
                setting={
                  simulationSettings
                    .optimize
                    .slAtr
                }
                onChange={
                  updateOptimizerSetting
                }
              />

            </div>


            {/* ==================================================
                FIXED SETTINGS
            ================================================== */}

            <h3 className="section-title">
              Fixed Settings
            </h3>


            <div className="form-grid">

              <Field
                label="Source"
                value={
                  simulationSettings
                    .baseSettings
                    .source
                }
                onChange={
                  event =>
                    updateBaseSetting(
                      "source",
                      event.target.value
                    )
                }
                type="select"
                options={[
                  "open",
                  "high",
                  "low",
                  "close",
                ]}
              />


              <Field
                label="Balance"
                value={
                  simulationSettings
                    .baseSettings
                    .balance
                }
                onChange={
                  event =>
                    updateBaseSetting(
                      "balance",
                      Number(
                        event.target.value
                      )
                    )
                }
                type="number"
                step="0.01"
              />


              <Field
                label="Leverage"
                value={
                  simulationSettings
                    .baseSettings
                    .leverage
                }
                onChange={
                  event =>
                    updateBaseSetting(
                      "leverage",
                      Number(
                        event.target.value
                      )
                    )
                }
                type="number"
                min="1"
              />

            </div>


            {/* ==================================================
                ESTIMATE
            ================================================== */}

            <div className="optimization-estimate">

              <div>

                <span>
                  Estimated combinations
                </span>

                <strong>
                  {
                    calculateCombinationCount()
                      .toLocaleString()
                  }
                </strong>

              </div>

              <div className="estimate-note">

                Based on the current optimizer
                ranges.

              </div>

            </div>


            {/* ==================================================
                ACTIONS
            ================================================== */}

            <div className="simulation-actions">

              <button
                className="secondary-button"
                disabled={
                  simulationLoading
                }
                onClick={
                  loadDefaultTest
                }
              >

                Load Default Test

              </button>


              <button
                className="primary-button"
                disabled={
                  simulationLoading
                }
                onClick={
                  runSimulation
                }
              >

                {simulationLoading
                  ? "Simulation Running..."
                  : "Run Simulation"}

              </button>

            </div>

          </section>


          {/* ====================================================
              LOADING
          ==================================================== */}

          {simulationLoading && (

            <section className="panel loading-panel">

              <div className="loading-header">

                <h2>
                  Simulation Running
                </h2>

                <strong>
                  {formatElapsed(
                    simulationElapsed
                  )}
                </strong>

              </div>


              <div className="progress-bar">

                <div className="progress-bar-fill" />

              </div>


              <p className="muted">

                Fetching candles and testing
                parameter combinations.

              </p>

            </section>

          )}


          {/* ====================================================
              ERROR
          ==================================================== */}

          {simulationError && (

            <ErrorBox
              message={
                simulationError
              }
            />

          )}


          {/* ====================================================
              RESULTS
          ==================================================== */}

          {simulationResults && (

            <>

              <section className="panel">

                <h2>
                  Simulation Summary
                </h2>


                <div className="results-grid">

                  <ResultCard
                    title="Coin"
                    value={
                      simulationResults.symbol
                    }
                  />

                  <ResultCard
                    title="Timeframe"
                    value={
                      simulationResults.timeframe
                    }
                  />

                  <ResultCard
                    title="Days"
                    value={
                      simulationResults.days
                    }
                  />

                  <ResultCard
                    title="Candles"
                    value={
                      Number(
                        simulationResults.candles ||
                        0
                      ).toLocaleString()
                    }
                  />

                  <ResultCard
                    title="Total Tests"
                    value={
                      Number(
                        simulationResults
                          .totalCombinations ||
                        0
                      ).toLocaleString()
                    }
                  />

                  <ResultCard
                    title="Completed"
                    value={
                      Number(
                        simulationResults
                          .completed ||
                        0
                      ).toLocaleString()
                    }
                  />

                  <ResultCard
                    title="Returned"
                    value={
                      Array.isArray(
                        simulationResults.results
                      )
                        ? simulationResults.results.length
                        : 0
                    }
                  />

                  <ResultCard
                    title="Elapsed"
                    value={
                      `${Number(
                        simulationResults
                          .elapsedSeconds ||
                        0
                      ).toFixed(
                        2
                      )}s`
                    }
                  />

                </div>

              </section>


              <section className="panel">

                <div className="results-header">

                  <div>

                    <h2>
                      Top 300 Results
                    </h2>

                    <p className="muted">

                      Showing{" "}

                      <strong>
                        {topResults.length}
                      </strong>

                      {" "}
                      returned results.

                      {" "}

                      Click a column header
                      to sort.

                    </p>

                  </div>

                </div>


                {topResults.length === 0 ? (

                  <div className="empty-results">

                    <strong>
                      No results returned.
                    </strong>

                    <p>
                      Check the backend console.
                    </p>

                  </div>

                ) : (

                  <TableWrapper>

                    <table>

                      <thead>

                        <tr>

                          <th>
                            Rank
                          </th>

                          <th>
                            Coin
                          </th>

                          <SortableHeader
                            field="optimizationScore"
                            label="Score"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          <SortableHeader
                            field="netProfit"
                            label="Net P&L"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          <SortableHeader
                            field="profitFactor"
                            label="PF"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          <SortableHeader
                            field="winRate"
                            label="Win Rate"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          <SortableHeader
                            field="totalTrades"
                            label="Trades"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          <SortableHeader
                            field="maxDrawdown"
                            label="Drawdown"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          <SortableHeader
                            field="emaLength"
                            label="EMA"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          <SortableHeader
                            field="smaLength"
                            label="SMA"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          <th>
                            Source
                          </th>

                          <SortableHeader
                            field="keltnerLength"
                            label="KC Length"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          <SortableHeader
                            field="keltnerMultiplier"
                            label="KC Mult"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          <SortableHeader
                            field="atrLength"
                            label="ATR"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          {/* NEW */}

                          <SortableHeader
                            field="stochasticLength"
                            label="Stoch Length"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          <SortableHeader
                            field="stochasticSmoothing"
                            label="Stoch Smooth"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          <th>
                            MACD
                          </th>

                          <SortableHeader
                            field="tpAtr"
                            label="TP"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                          <SortableHeader
                            field="slAtr"
                            label="SL"
                            sort={resultSort}
                            onSort={
                              handleResultSort
                            }
                          />

                        </tr>

                      </thead>


                      <tbody>

                        {topResults.map(
                          (
                            result,
                            index
                          ) => (

                            <tr
                              key={
                                [
                                  simulationResults.symbol,
                                  index,
                                  result.emaLength,
                                  result.smaLength,
                                  result.keltnerLength,
                                  result.keltnerMultiplier,
                                  result.atrLength,
                                  result.stochasticLength,
                                  result.stochasticSmoothing,
                                  result.macdFast,
                                  result.macdSlow,
                                  result.macdSignal,
                                  result.tpAtr,
                                  result.slAtr,
                                ].join(
                                  "-"
                                )
                              }
                            >

                              <td>
                                <strong>
                                  {
                                    index + 1
                                  }
                                </strong>
                              </td>


                              <td>
                                {
                                  simulationResults
                                    .symbol
                                }
                              </td>


                              <td>
                                {
                                  formatNumber(
                                    result
                                      .optimizationScore,
                                    4
                                  )
                                }
                              </td>


                              <ProfitCell
                                value={
                                  result.netProfit
                                }
                              >

                                {
                                  formatMoney(
                                    result.netProfit
                                  )
                                }

                              </ProfitCell>


                              <td>
                                {
                                  getProfitFactor(
                                    result
                                      .profitFactor
                                  )
                                }
                              </td>


                              <td>
                                {
                                  formatPercent(
                                    result.winRate
                                  )
                                }
                              </td>


                              <td>
                                <strong>
                                  {
                                    result.totalTrades
                                  }
                                </strong>
                              </td>


                              <td>
                                {
                                  formatPercent(
                                    result.maxDrawdown
                                  )
                                }
                              </td>


                              <td>
                                {
                                  result.emaLength
                                }
                              </td>


                              <td>
                                {
                                  result.smaLength
                                }
                              </td>


                              <td>
                                {
                                  result.source
                                }
                              </td>


                              <td>
                                {
                                  result.keltnerLength
                                }
                              </td>


                              <td>
                                {
                                  result.keltnerMultiplier
                                }
                              </td>


                              <td>
                                {
                                  result.atrLength
                                }
                              </td>


                              {/* NEW */}

                              <td>
                                {
                                  result.stochasticLength
                                }
                              </td>


                              <td>
                                {
                                  result.stochasticSmoothing
                                }
                              </td>


                              <td>
                                {
                                  result.macdFast
                                }
                                /
                                {
                                  result.macdSlow
                                }
                                /
                                {
                                  result.macdSignal
                                }
                              </td>


                              <td>
                                {
                                  result.tpAtr
                                }
                              </td>


                              <td>
                                {
                                  result.slAtr ??
                                  "NONE"
                                }
                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </TableWrapper>

                )}

              </section>

            </>

          )}

        </>

      )}

    </div>

  );

}


// ============================================================
// SORTABLE HEADER
// ============================================================

function SortableHeader({
  field,
  label,
  sort,
  onSort,
}) {

  const isActive =
    sort.field === field;


  const indicator =
    isActive

      ? (
          sort.direction === "desc"
            ? "↓"
            : "↑"
        )

      : "↕";


  return (

    <th
      onClick={() =>
        onSort(field)
      }
      style={{
        cursor:
          "pointer",

        userSelect:
          "none",

        whiteSpace:
          "nowrap",
      }}
      title={
        `Sort by ${label}`
      }
    >

      {label}

      {" "}

      <span
        style={{
          opacity:
            isActive
              ? 1
              : 0.4,
        }}
      >
        {indicator}
      </span>

    </th>

  );

}


// ============================================================
// RANGE OPTIMIZER
// ============================================================

function RangeOptimizer({
  label,
  name,
  setting,
  onChange,
  integer = false,
}) {

  function numberValue(
    value
  ) {

    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {

      return "";

    }


    const number =
      Number(
        value
      );


    if (
      !Number.isFinite(
        number
      )
    ) {

      return "";

    }


    return number;

  }


  function handleChange(
    field,
    rawValue
  ) {

    const value =
      field === "enabled"

        ? rawValue

        : numberValue(
            rawValue
          );


    console.log(
      "RANGE INPUT CHANGED:",
      {
        parameter:
          name,

        field,

        rawValue,

        value,

      }
    );


    onChange(
      name,
      field,
      value
    );

  }


  return (

    <div className="optimizer-row">

      <div className="optimizer-header">

        <label>

          <input
            type="checkbox"
            checked={
              setting.enabled
            }
            onChange={
              event =>
                handleChange(
                  "enabled",
                  event.target.checked
                )
            }
          />

          <strong>
            {label}
          </strong>

        </label>

      </div>


      {!setting.enabled ? (

        <div className="fixed-value">

          <span>
            Fixed:
          </span>

          <input
            type="number"
            value={
              setting.value ?? ""
            }
            step={
              integer
                ? "1"
                : "0.1"
            }
            onChange={
              event =>
                handleChange(
                  "value",
                  event.target.value
                )
            }
          />

        </div>

      ) : (

        <div className="range-fields">

          <div>

            <span>
              From
            </span>

            <input
              type="number"
              value={
                setting.from ?? ""
              }
              step={
                integer
                  ? "1"
                  : "0.1"
              }
              onChange={
                event =>
                  handleChange(
                    "from",
                    event.target.value
                  )
              }
            />

          </div>


          <div>

            <span>
              To
            </span>

            <input
              type="number"
              value={
                setting.to ?? ""
              }
              step={
                integer
                  ? "1"
                  : "0.1"
              }
              onChange={
                event =>
                  handleChange(
                    "to",
                    event.target.value
                  )
              }
            />

          </div>


          <div>

            <span>
              Step
            </span>

            <input
              type="number"
              value={
                setting.step ?? ""
              }
              min={
                integer
                  ? "1"
                  : "0.01"
              }
              step={
                integer
                  ? "1"
                  : "0.1"
              }
              onChange={
                event =>
                  handleChange(
                    "step",
                    event.target.value
                  )
              }
            />

          </div>

        </div>

      )}

    </div>

  );

}


// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  value,
  onChange,
  type,
  options,
  min,
  step,
}) {

  return (

    <div className="field">

      <label>
        {label}
      </label>


      {type === "select" ? (

        <select
          value={
            value
          }
          onChange={
            onChange
          }
        >

          {options.map(
            option => (

              <option
                key={
                  option
                }
                value={
                  option
                }
              >
                {option}
              </option>

            )
          )}

        </select>

      ) : (

        <input
          type={
            type
          }
          value={
            value
          }
          onChange={
            onChange
          }
          min={
            min
          }
          step={
            step ||
            "1"
          }
        />

      )}

    </div>

  );

}


// ============================================================
// RESULT CARD
// ============================================================

function ResultCard({
  title,
  value,
}) {

  return (

    <div className="result-card">

      <div className="result-card-title">
        {title}
      </div>

      <div className="result-card-value">
        {value}
      </div>

    </div>

  );

}


// ============================================================
// TABLE
// ============================================================

function TableWrapper({
  children,
}) {

  return (

    <div className="table-wrapper">

      {children}

    </div>

  );

}


// ============================================================
// PROFIT CELL
// ============================================================

function ProfitCell({
  value,
  children,
}) {

  const number =
    Number(
      value
    );


  const className =
    number > 0

      ? "profit-positive"

      : number < 0

        ? "profit-negative"

        : "";


  return (

    <td
      className={
        className
      }
    >
      {children}
    </td>

  );

}


// ============================================================
// ERROR
// ============================================================

function ErrorBox({
  message,
}) {

  return (

    <div className="error-box">

      <strong>
        Simulation Error:
      </strong>

      {" "}

      {message}

    </div>

  );

}


export default App;