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
  // Default = highest number of trades first
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

        emaLength: 285,

        smaLength: 20,

        keltnerLength: 20,

        keltnerMultiplier: 1,

        atrLength: 10,

        stochasticLength: 10,

        stochasticSmoothing: 2,

        macdFast: 6,

        macdSlow: 34,

        macdSignal: 5,

        tpAtr: 10,

        slAtr: null,

        margin: 3,

        leverage: 10,

        roundTripFee: 0.04,

        cooldownBars: 0,

      },

      optimize: {

        emaLength: {
          enabled: true,
          from: 180,
          to: 350,
          step: 1,
        },

        smaLength: {
          enabled: false,
          value: 20,
        },

        keltnerLength: {
          enabled: false,
          value: 20,
        },

        keltnerMultiplier: {
          enabled: false,
          value: 1,
        },

        atrLength: {
          enabled: false,
          value: 10,
        },

        stochastic: {
          enabled: false,
          value: 2,
        },

        macdFast: {
          enabled: false,
          value: 6,
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
          value: 10,
        },

        slAtr: {
          enabled: false,
          value: null,
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
  // DEBUG - CURRENT STATE
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
  // UPDATE BASE SETTING
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

          [name]: value,

        },

      })
    );

  }


  // ==========================================================
  // UPDATE OPTIMIZER SETTING
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

            [field]: value,

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
  // RESULT SORTING
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

          direction: "desc",

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
      !Array.isArray(results)
    ) {

      return [];

    }


    return [...results].sort(
      (a, b) => {

        let aValue =
          a?.[resultSort.field];

        let bValue =
          b?.[resultSort.field];


        // --------------------------------------------------
        // NULL / UNDEFINED
        // --------------------------------------------------

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


        // --------------------------------------------------
        // NUMBERS
        // --------------------------------------------------

        const aNumber =
          Number(aValue);

        const bNumber =
          Number(bValue);


        if (
          Number.isFinite(aNumber) &&
          Number.isFinite(bNumber)
        ) {

          return resultSort.direction === "asc"
            ? aNumber - bNumber
            : bNumber - aNumber;

        }


        // --------------------------------------------------
        // STRINGS
        // --------------------------------------------------

        const aString =
          String(aValue);

        const bString =
          String(bValue);


        const comparison =
          aString.localeCompare(
            bString
          );


        return resultSort.direction === "asc"
          ? comparison
          : -comparison;

      }
    );

  }


  // ==========================================================
  // RUN SIMULATION
  // ==========================================================

  async function runSimulation() {

    try {

      setSimulationLoading(true);

      setSimulationResults(null);

      setSimulationError(null);

      setSimulationElapsed(0);


      // ======================================================
      // BUILD PAYLOAD
      // ======================================================

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

        // Frontend state:
        // simulationSettings.optimize
        //
        // API property:
        // optimization

        optimization:
          simulationSettings.optimize,

      };


      // ======================================================
      // DEBUG
      // ======================================================

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
        "SYMBOL:",
        payload.symbol
      );

      console.log(
        "TIMEFRAME:",
        payload.timeframe
      );

      console.log(
        "DAYS:",
        payload.days
      );

      console.log(
        "OPTIMIZATION:"
      );

      console.log(
        JSON.stringify(
          payload.optimization,
          null,
          2
        )
      );

      console.log(
        "FULL PAYLOAD:"
      );

      console.log(
        JSON.stringify(
          payload,
          null,
          2
        )
      );

      console.log(
        "=================================================="
      );


      // ======================================================
      // CHECK PAYLOAD
      // ======================================================

      if (
        !payload.optimization ||
        typeof payload.optimization !== "object"
      ) {

        throw new Error(
          "Optimization settings are missing from payload."
        );

      }


      // ======================================================
      // SEND REQUEST
      // ======================================================

      console.log(
        "POST:",
        `${API_URL}/api/simulate`
      );


      const response =
        await fetch(
          `${API_URL}/api/simulate`,
          {

            method: "POST",

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


      console.log(
        "HTTP STATUS:",
        response.status
      );


      // ======================================================
      // CHECK CONTENT TYPE
      // ======================================================

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


        console.error(
          "NON JSON RESPONSE:",
          text
        );


        throw new Error(
          `API returned non-JSON response (${response.status}). ` +
          `Check that the backend is running on ${API_URL}. ` +
          `Response: ${text.slice(0, 300)}`
        );

      }


      // ======================================================
      // READ RESPONSE
      // ======================================================

      const data =
        await response.json();


      console.log("");

      console.log(
        "=================================================="
      );

      console.log(
        "SIMULATION RESPONSE"
      );

      console.log(
        "=================================================="
      );

      console.log(
        "Success:",
        data.success
      );

      console.log(
        "Total combinations:",
        data.totalCombinations
      );

      console.log(
        "Completed:",
        data.completed
      );

      console.log(
        "Returned results:",
        Array.isArray(data.results)
          ? data.results.length
          : "NOT ARRAY"
      );

      console.log(
        "Results:",
        data.results
      );

      console.log(
        "=================================================="
      );


      // ======================================================
      // API ERROR
      // ======================================================

      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.error ||
          "Simulation failed."
        );

      }


      // ======================================================
      // VALIDATE RESULTS
      // ======================================================

      if (
        !Array.isArray(
          data.results
        )
      ) {

        console.error(
          "BACKEND DID NOT RETURN AN ARRAY:",
          data.results
        );

        throw new Error(
          "Backend returned an invalid results format."
        );

      }


      // ======================================================
      // STORE RESULTS
      // ======================================================

      console.log(
        "SETTING RESULTS INTO REACT:",
        data.results.length
      );


      setSimulationResults(
        data
      );


    } catch (error) {

      console.error(
        "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
      );

      console.error(
        "SIMULATION ERROR"
      );

      console.error(
        error
      );

      console.error(
        "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
      );


      setSimulationError(
        error.message
      );


    } finally {

      setSimulationLoading(false);

    }

  }


  // ==========================================================
  // FORMATTERS
  // ==========================================================

  function formatMoney(
    value
  ) {

    const number =
      Number(value);


    if (
      !Number.isFinite(number)
    ) {

      return "$0.0000";

    }


    const sign =
      number > 0
        ? "+"
        : "";


    return (
      `${sign}$${number.toFixed(4)}`
    );

  }


  function formatNumber(
    value,
    decimals = 2
  ) {

    const number =
      Number(value);


    if (
      !Number.isFinite(number)
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
      Number(value);


    if (
      !Number.isFinite(number)
    ) {

      return "-";

    }


    return (
      `${number.toFixed(2)}%`
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
      `${String(minutes).padStart(2, "0")}:` +
      `${String(secs).padStart(2, "0")}`
    );

  }


  // ==========================================================
  // TOP 300 RESULTS
  // ==========================================================

  const topResults =
    useMemo(() => {

      if (
        !simulationResults
      ) {

        return [];

      }


      if (
        !Array.isArray(
          simulationResults.results
        )
      ) {

        console.error(
          "simulationResults.results is not an array:",
          simulationResults.results
        );

        return [];

      }


      const results =
        sortResults(
          simulationResults.results
        );


      console.log(
        "TABLE RESULTS:",
        results.length
      );


      return results.slice(
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


      {/* ======================================================
          TABS
      ====================================================== */}

      <div className="tabs">

        <button
          className={
            activeTab === "simulation"
              ? "tab-button active"
              : "tab-button"
          }
          onClick={() =>
            setActiveTab("simulation")
          }
        >

          Simulation

        </button>

      </div>


      {/* ======================================================
          SIMULATION
      ====================================================== */}

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
                integer={true}
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
                integer={true}
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
                integer={true}
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
                integer={false}
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
                integer={true}
              />


              <RangeOptimizer
                label="Stoch"
                name="stochastic"
                setting={
                  simulationSettings
                    .optimize
                    .stochastic
                }
                onChange={
                  updateOptimizerSetting
                }
                integer={true}
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
                integer={true}
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
                integer={true}
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
                integer={true}
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
                integer={false}
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
                integer={false}
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
                RUN
            ================================================== */}

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

              {/* ==================================================
                  SUMMARY
              ================================================== */}

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
                        simulationResults.candles || 0
                      ).toLocaleString()
                    }
                  />

                  <ResultCard
                    title="Total Tests"
                    value={
                      Number(
                        simulationResults.totalCombinations || 0
                      ).toLocaleString()
                    }
                  />

                  <ResultCard
                    title="Completed"
                    value={
                      Number(
                        simulationResults.completed || 0
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
                        simulationResults.elapsedSeconds || 0
                      ).toFixed(2)}s`
                    }
                  />

                </div>

              </section>


              {/* ==================================================
                  RESULTS TABLE
              ================================================== */}

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

                  <div className="muted">
                    The backend returned no results.
                    Check the browser console for details.
                  </div>

                ) : (

                  <TableWrapper>

                    <table>

                      <thead>

                        <tr>

                          {/* RANK IS NOT SORTABLE */}

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


                          <SortableHeader
                            field="stochasticSmoothing"
                            label="Stoch"
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
                                  result.macdFast,
                                  result.macdSlow,
                                  result.macdSignal,
                                  result.tpAtr,
                                  result.slAtr,
                                ].join("-")
                              }
                            >

                              {/* RANK */}

                              <td>
                                <strong>
                                  {index + 1}
                                </strong>
                              </td>


                              {/* COIN */}

                              <td>
                                {
                                  simulationResults.symbol
                                }
                              </td>


                              {/* SCORE */}

                              <td>
                                {formatNumber(
                                  result.optimizationScore,
                                  4
                                )}
                              </td>


                              {/* NET P&L */}

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


                              {/* PF */}

                              <td>
                                {
                                  getProfitFactor(
                                    result.profitFactor
                                  )
                                }
                              </td>


                              {/* WIN RATE */}

                              <td>
                                {
                                  formatPercent(
                                    result.winRate
                                  )
                                }
                              </td>


                              {/* TRADES */}

                              <td>
                                <strong>
                                  {
                                    result.totalTrades
                                  }
                                </strong>
                              </td>


                              {/* DRAWDOWN */}

                              <td>
                                {
                                  formatPercent(
                                    result.maxDrawdown
                                  )
                                }
                              </td>


                              {/* EMA */}

                              <td>
                                {
                                  result.emaLength
                                }
                              </td>


                              {/* SMA */}

                              <td>
                                {
                                  result.smaLength
                                }
                              </td>


                              {/* SOURCE */}

                              <td>
                                {
                                  result.source
                                }
                              </td>


                              {/* KC LENGTH */}

                              <td>
                                {
                                  result.keltnerLength
                                }
                              </td>


                              {/* KC MULT */}

                              <td>
                                {
                                  result.keltnerMultiplier
                                }
                              </td>


                              {/* ATR */}

                              <td>
                                {
                                  result.atrLength
                                }
                              </td>


                              {/* STOCH */}

                              <td>
                                {
                                  result.stochasticSmoothing
                                }
                              </td>


                              {/* MACD */}

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


                              {/* TP */}

                              <td>
                                {
                                  result.tpAtr
                                }
                              </td>


                              {/* SL */}

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
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
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
      Number(value);


    if (
      !Number.isFinite(number)
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
          value={value}
          onChange={onChange}
        >

          {options.map(
            option => (

              <option
                key={option}
                value={option}
              >
                {option}
              </option>

            )
          )}

        </select>

      ) : (

        <input
          type={type}
          value={value}
          onChange={onChange}
          min={min}
          step={step || "1"}
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
    Number(value);


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

