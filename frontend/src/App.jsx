import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./App.css";


const API_URL =
  "http://localhost:3001";


// ============================================================
// SAFETY LIMIT
// ============================================================

const MAX_COMBINATIONS =
  1_000_000;


// ============================================================
// CASCADE PARAMETERS
// ============================================================
//
// Broad search happens automatically.
// The numbers found here are NOT hardcoded.
// They are discovered from the optimizer.
//
// ============================================================

const CASCADE_PARAMETERS = [

  {
    key: "emaLength",
    label: "EMA",

    broadFrom: 5,
    broadTo: 1000,
    broadStep: 20,

    integer: true,

    finalRange: 5,
  },

  {
    key: "smaLength",
    label: "SMA",

    broadFrom: 2,
    broadTo: 100,
    broadStep: 2,

    integer: true,

    finalRange: 5,
  },

  {
    key: "keltnerLength",
    label: "KC Length",

    broadFrom: 2,
    broadTo: 100,
    broadStep: 5,

    integer: true,

    finalRange: 5,
  },

  {
    key: "keltnerMultiplier",
    label: "KC Mult",

    broadFrom: 0.1,
    broadTo: 5,
    broadStep: 0.2,

    integer: false,

    finalRange: 0.5,
  },

  {
    key: "atrLength",
    label: "ATR",

    broadFrom: 2,
    broadTo: 100,
    broadStep: 5,

    integer: true,

    finalRange: 5,
  },

  {
    key: "stochasticLength",
    label: "Stoch Length",

    broadFrom: 2,
    broadTo: 50,
    broadStep: 5,

    integer: true,

    finalRange: 5,
  },

  {
    key: "stochasticSmoothing",
    label: "Stoch Smooth",

    broadFrom: 1,
    broadTo: 10,
    broadStep: 1,

    integer: true,

    finalRange: 5,
  },

  {
    key: "macdFast",
    label: "MACD Fast",

    broadFrom: 1,
    broadTo: 50,
    broadStep: 5,

    integer: true,

    finalRange: 5,
  },

  {
    key: "macdSlow",
    label: "MACD Slow",

    broadFrom: 2,
    broadTo: 100,
    broadStep: 10,

    integer: true,

    finalRange: 5,
  },

  {
    key: "macdSignal",
    label: "MACD Signal",

    broadFrom: 1,
    broadTo: 50,
    broadStep: 5,

    integer: true,

    finalRange: 5,
  },

  {
    key: "tpAtr",
    label: "TP ATR",

    broadFrom: 0.1,
    broadTo: 100,
    broadStep: 5,

    integer: false,

    finalRange: 5,
  },

];


// ============================================================
// PARAMETER LIMITS
// ============================================================

const PARAMETER_LIMITS = {

  emaLength: {
    min: 5,
    max: 1000,
  },

  smaLength: {
    min: 2,
    max: 500,
  },

  keltnerLength: {
    min: 2,
    max: 200,
  },

  keltnerMultiplier: {
    min: 0.1,
    max: 10,
  },

  atrLength: {
    min: 2,
    max: 200,
  },

  stochasticLength: {
    min: 2,
    max: 100,
  },

  stochasticSmoothing: {
    min: 1,
    max: 20,
  },

  macdFast: {
    min: 1,
    max: 100,
  },

  macdSlow: {
    min: 2,
    max: 300,
  },

  macdSignal: {
    min: 1,
    max: 100,
  },

  tpAtr: {
    min: 0.1,
    max: 100,
  },

  slAtr: {
    min: 0.1,
    max: 50,
  },

};


// ============================================================
// APP
// ============================================================

function App() {

  // ==========================================================
  // TAB
  // ==========================================================

  const [
    activeTab,
    setActiveTab,
  ] =
    useState(
      "simulation"
    );


  // ==========================================================
  // SIMULATION SETTINGS
  // ==========================================================

  const [
    simulationSettings,
    setSimulationSettings,
  ] =
    useState({

      symbol:
        "1000BONKUSDT",

      timeframe:
        "15m",

      days:
        30,

      baseSettings: {

        balance:
          100,

        source:
          "low",

        emaLength:
          200,

        smaLength:
          25,

        keltnerLength:
          10,

        keltnerMultiplier:
          2,

        atrLength:
          15,

        stochasticLength:
          10,

        stochasticSmoothing:
          1,

        macdFast:
          4,

        macdSlow:
          34,

        macdSignal:
          5,

        tpAtr:
          15,

        slAtr:
          3,

        margin:
          3,

        leverage:
          10,

        roundTripFee:
          0.04,

        cooldownBars:
          0,

      },


      // ========================================================
      // ORIGINAL FULL OPTIMIZER
      // ========================================================

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


  // ==========================================================
  // CASCADE
  // ==========================================================

  const [
    cascadeRunning,
    setCascadeRunning,
  ] =
    useState(
      false
    );


  const [
    cascadeProgress,
    setCascadeProgress,
  ] =
    useState(
      0
    );


  const [
    cascadeResults,
    setCascadeResults,
  ] =
    useState(
      null
    );


  const [
    cascadeError,
    setCascadeError,
  ] =
    useState(
      null
    );


  // ==========================================================
  // FULL SIMULATION
  // ==========================================================

  const [
    simulationResults,
    setSimulationResults,
  ] =
    useState(
      null
    );


  const [
    simulationLoading,
    setSimulationLoading,
  ] =
    useState(
      false
    );


  const [
    simulationError,
    setSimulationError,
  ] =
    useState(
      null
    );


  const [
    simulationElapsed,
    setSimulationElapsed,
  ] =
    useState(
      0
    );


  // ==========================================================
  // RESULT SORT
  // ==========================================================

  const [
    resultSort,
    setResultSort,
  ] =
    useState({

      field:
        "totalTrades",

      direction:
        "desc",

    });


  // ==========================================================
  // TIMER
  // ==========================================================

  useEffect(
    () => {

      if (
        !simulationLoading &&
        !cascadeRunning
      ) {

        return;

      }


      const interval =
        setInterval(
          () => {

            setSimulationElapsed(
              value =>
                value + 1
            );

          },
          1000
        );


      return () =>
        clearInterval(
          interval
        );

    },
    [
      simulationLoading,
      cascadeRunning,
    ]
  );


  // ==========================================================
  // BASE SETTING
  // ==========================================================

  function updateBaseSetting(
    name,
    value
  ) {

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
  // OPTIMIZER SETTING
  // ==========================================================

  function updateOptimizerSetting(
    name,
    field,
    value
  ) {

    setSimulationSettings(
      previous => {

        if (
          !previous.optimize[
            name
          ]
        ) {

          console.error(
            "Unknown optimizer parameter:",
            name
          );

          return previous;

        }


        return {

          ...previous,

          optimize: {

            ...previous.optimize,

            [name]: {

              ...previous.optimize[
                name
              ],

              [field]:
                value,

            },

          },

        };

      }
    );

  }


  // ==========================================================
  // LOAD PINE DEFAULTS
  // ==========================================================

  function loadPineDefaults() {

    setSimulationSettings(
      previous => ({

        ...previous,

        baseSettings: {

          ...previous.baseSettings,

          emaLength:
            200,

          smaLength:
            25,

          keltnerLength:
            10,

          keltnerMultiplier:
            2,

          atrLength:
            15,

          stochasticLength:
            10,

          stochasticSmoothing:
            1,

          macdFast:
            4,

          macdSlow:
            34,

          macdSignal:
            5,

          tpAtr:
            15,

          slAtr:
            3,

        },

        optimize: {

          ...previous.optimize,

          emaLength: {
            enabled:
              true,

            from:
              180,

            to:
              350,

            step:
              1,
          },

          smaLength: {
            enabled:
              false,

            value:
              25,
          },

          keltnerLength: {
            enabled:
              false,

            value:
              10,
          },

          keltnerMultiplier: {
            enabled:
              false,

            value:
              2,
          },

          atrLength: {
            enabled:
              false,

            value:
              15,
          },

          stochasticLength: {
            enabled:
              false,

            value:
              10,
          },

          stochastic: {
            enabled:
              false,

            value:
              1,
          },

          macdFast: {
            enabled:
              false,

            value:
              4,
          },

          macdSlow: {
            enabled:
              false,

            value:
              34,
          },

          macdSignal: {
            enabled:
              false,

            value:
              5,
          },

          tpAtr: {
            enabled:
              false,

            value:
              15,
          },

          slAtr: {
            enabled:
              false,

            value:
              3,
          },

        },

      })
    );

  }


  // ==========================================================
  // HTTP JSON
  // ==========================================================

  async function postJSON(
    endpoint,
    payload
  ) {

    const response =
      await fetch(
        `${API_URL}${endpoint}`,
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
        `API returned non-JSON response (${response.status}): ${text.slice(
          0,
          300
        )}`
      );

    }


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.error ||
        `Request failed: ${response.status}`
      );

    }


    return data;

  }


  // ==========================================================
  // FINAL RANGE
  // ==========================================================

  function buildFinalRange(
    parameter,
    best
  ) {

    const definition =
      CASCADE_PARAMETERS.find(
        item =>
          item.key ===
          parameter
      );


    const limits =
      PARAMETER_LIMITS[
        parameter
      ];


    if (
      !definition ||
      !limits
    ) {

      return null;

    }


    const numericBest =
      Number(
        best
      );


    if (
      !Number.isFinite(
        numericBest
      )
    ) {

      return null;

    }


    if (
      definition.integer
    ) {

      const from =
        Math.max(
          limits.min,
          Math.round(
            numericBest -
            definition.finalRange
          )
        );


      const to =
        Math.min(
          limits.max,
          Math.round(
            numericBest +
            definition.finalRange
          )
        );


      return {

        enabled:
          true,

        from,

        to,

        step:
          1,

      };

    }


    const from =
      Math.max(
        limits.min,
        Number(
          (
            numericBest -
            definition.finalRange
          ).toFixed(1)
        )
      );


    const to =
      Math.min(
        limits.max,
        Number(
          (
            numericBest +
            definition.finalRange
          ).toFixed(1)
        )
      );


    return {

      enabled:
        true,

      from,

      to,

      step:
        0.1,

    };

  }


  // ==========================================================
  // CALCULATE FULL COMBINATIONS
  // ==========================================================

  function countRangeValues(
    setting
  ) {

    if (
      !setting
    ) {

      return 1;

    }


    if (
      setting.enabled !==
      true
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


    const count =
      Math.floor(
        (
          to -
          from
        ) /
        step
      ) + 1;


    return Math.max(
      1,
      count
    );

  }


  function calculateFullCombinationCount() {

    const optimize =
      simulationSettings.optimize;


    const keys = [

      "emaLength",

      "smaLength",

      "keltnerLength",

      "keltnerMultiplier",

      "atrLength",

      "stochasticLength",

      "stochastic",

      "macdFast",

      "macdSlow",

      "macdSignal",

      "tpAtr",

      "slAtr",

    ];


    let total =
      1;


    for (
      const key
      of keys
    ) {

      const count =
        countRangeValues(
          optimize[
            key
          ]
        );


      // Prevent the counter itself
      // from becoming a gigantic number.

      if (
        total >
        MAX_COMBINATIONS /
        count
      ) {

        return (
          MAX_COMBINATIONS +
          1
        );

      }


      total *=
        count;

    }


    return total;

  }


  const fullCombinationCount =
    calculateFullCombinationCount();


  const fullSimulationTooLarge =
    fullCombinationCount >
    MAX_COMBINATIONS;


  // ==========================================================
  // AUTOMATIC CASCADE
  // ==========================================================

  async function runAutomaticCascade() {

    if (
      cascadeRunning ||
      simulationLoading
    ) {

      return;

    }


    try {

      setCascadeRunning(
        true
      );

      setCascadeProgress(
        0
      );

      setCascadeResults(
        null
      );

      setCascadeError(
        null
      );

      setSimulationError(
        null
      );

      setSimulationElapsed(
        0
      );


      // ======================================================
      // IMPORTANT
      //
      // This starts with the current base settings.
      // Each winner is carried into the next step.
      //
      // Nothing is hardcoded as the answer.
      // ======================================================

      const selectedValues = {

        emaLength:
          Number(
            simulationSettings
              .baseSettings
              .emaLength
          ),

        smaLength:
          Number(
            simulationSettings
              .baseSettings
              .smaLength
          ),

        keltnerLength:
          Number(
            simulationSettings
              .baseSettings
              .keltnerLength
          ),

        keltnerMultiplier:
          Number(
            simulationSettings
              .baseSettings
              .keltnerMultiplier
          ),

        atrLength:
          Number(
            simulationSettings
              .baseSettings
              .atrLength
          ),

        stochasticLength:
          Number(
            simulationSettings
              .baseSettings
              .stochasticLength
          ),

        stochasticSmoothing:
          Number(
            simulationSettings
              .baseSettings
              .stochasticSmoothing
          ),

        macdFast:
          Number(
            simulationSettings
              .baseSettings
              .macdFast
          ),

        macdSlow:
          Number(
            simulationSettings
              .baseSettings
              .macdSlow
          ),

        macdSignal:
          Number(
            simulationSettings
              .baseSettings
              .macdSignal
          ),

        tpAtr:
          Number(
            simulationSettings
              .baseSettings
              .tpAtr
          ),

      };


      const results = [];


      // ======================================================
      // EACH STEP
      // ======================================================

      for (
        let index = 0;

        index <
        CASCADE_PARAMETERS.length;

        index++
      ) {

        const parameter =
          CASCADE_PARAMETERS[
            index
          ];


        console.log(
          ""
        );

        console.log(
          "=================================================="
        );

        console.log(
          `AUTO CASCADE STEP ${
            index + 1
          } / ${
            CASCADE_PARAMETERS.length
          }`
        );

        console.log(
          "Parameter:",
          parameter.label
        );

        console.log(
          "=================================================="
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

          parameter:
            parameter.key,

          from:
            parameter.broadFrom,

          to:
            parameter.broadTo,

          step:
            parameter.broadStep,

          baseSettings:
            simulationSettings.baseSettings,

          selectedValues:
            {
              ...selectedValues,
            },

        };


        console.log(
          "CASCADE PAYLOAD:",
          payload
        );


        const data =
          await postJSON(
            "/api/optimize-step",
            payload
          );


        if (
          !Array.isArray(
            data.results
          ) ||
          data.results.length === 0
        ) {

          throw new Error(
            `No results returned for ${parameter.label}.`
          );

        }


        const best =
          data.results[0];


        const bestValue =
          Number(
            best[
              parameter.key
            ]
          );


        if (
          !Number.isFinite(
            bestValue
          )
        ) {

          throw new Error(
            `Invalid best ${parameter.label} returned by backend.`
          );

        }


        // ====================================================
        // CARRY WINNER FORWARD
        // ====================================================

        selectedValues[
          parameter.key
        ] =
          bestValue;


        // ====================================================
        // SAVE RESULT
        // ====================================================

        results.push({

          parameter:
            parameter.key,

          label:
            parameter.label,

          value:
            bestValue,

          netProfit:
            Number(
              best.netProfit ??
              0
            ),

          totalTrades:
            Number(
              best.totalTrades ??
              0
            ),

          profitFactor:
            best.profitFactor,

          winRate:
            Number(
              best.winRate ??
              0
            ),

          maxDrawdown:
            Number(
              best.maxDrawdown ??
              0
            ),

        });


        // ====================================================
        // UPDATE PROGRESS
        // ====================================================

        const progress =
          Math.round(
            (
              (
                index +
                1
              ) /
              CASCADE_PARAMETERS.length
            ) *
            100
          );


        setCascadeProgress(
          progress
        );

      }


      // ======================================================
      // BEST VALUES
      // ======================================================

      const bestValues = {

        emaLength:
          selectedValues.emaLength,

        smaLength:
          selectedValues.smaLength,

        keltnerLength:
          selectedValues.keltnerLength,

        keltnerMultiplier:
          selectedValues.keltnerMultiplier,

        atrLength:
          selectedValues.atrLength,

        stochasticLength:
          selectedValues.stochasticLength,

        stochasticSmoothing:
          selectedValues.stochasticSmoothing,

        macdFast:
          selectedValues.macdFast,

        macdSlow:
          selectedValues.macdSlow,

        macdSignal:
          selectedValues.macdSignal,

        tpAtr:
          selectedValues.tpAtr,

      };


      // ======================================================
      // BUILD FINAL MANUAL OPTIMIZER
      // ======================================================

      const finalOptimization = {

        ...simulationSettings.optimize,

      };


      for (
        const parameter
        of CASCADE_PARAMETERS
      ) {

        const range =
          buildFinalRange(
            parameter.key,
            bestValues[
              parameter.key
            ]
          );


        if (
          range
        ) {

          finalOptimization[
            parameter.key
          ] =
            range;

        }

      }


      // Keep SL manual.
      //
      // We do NOT automatically optimize SL in the cascade
      // because you didn't include SL in the automatic list.

      // ======================================================
      // SAVE INTO FRONTEND
      // ======================================================

      setSimulationSettings(
        previous => ({

          ...previous,

          baseSettings: {

            ...previous.baseSettings,

            ...bestValues,

          },

          optimize:
            finalOptimization,

        })
      );


      setCascadeResults({

        bestValues,

        results,

        finalOptimization,

      });


      console.log(
        "=================================================="
      );

      console.log(
        "CASCADE COMPLETE"
      );

      console.log(
        "BEST VALUES:",
        bestValues
      );

      console.log(
        "FINAL OPTIMIZER:",
        finalOptimization
      );

      console.log(
        "=================================================="
      );


    } catch (
      error
    ) {

      console.error(
        "AUTOMATIC CASCADE ERROR:",
        error
      );


      setCascadeError(
        error.message
      );

    } finally {

      setCascadeRunning(
        false
      );

    }

  }


  // ==========================================================
  // FULL SIMULATION
  // ==========================================================

  async function runSimulation() {

    const combinationCount =
      calculateFullCombinationCount();


    // ========================================================
    // HARD FRONTEND SAFETY CHECK
    // ========================================================

    if (
      combinationCount >
      MAX_COMBINATIONS
    ) {

      setSimulationError(
        `Too many combinations: ${
          combinationCount.toLocaleString()
        }. Maximum allowed is ${
          MAX_COMBINATIONS.toLocaleString()
        }. Reduce the ranges first.`
      );

      return;

    }


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


      console.log(
        "=================================================="
      );

      console.log(
        "FULL SIMULATION"
      );

      console.log(
        "Expected combinations:",
        combinationCount
      );

      console.log(
        "PAYLOAD:",
        payload
      );

      console.log(
        "=================================================="
      );


      const data =
        await postJSON(
          "/api/simulate",
          payload
        );


      setSimulationResults(
        data
      );


    } catch (
      error
    ) {

      console.error(
        "FULL SIMULATION ERROR:",
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
  // SORTING
  // ==========================================================

  function handleResultSort(
    field
  ) {

    setResultSort(
      previous => {

        if (
          previous.field ===
          field
        ) {

          return {

            field,

            direction:
              previous.direction ===
              "desc"
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
      ...results,
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

          aValue =
            0;

        }


        if (
          bValue === null ||
          bValue === undefined
        ) {

          bValue =
            0;

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

          return resultSort.direction ===
            "asc"

            ? aNumber -
              bNumber

            : bNumber -
              aNumber;

        }


        return (
          resultSort.direction ===
          "asc"

            ? String(
                aValue
              ).localeCompare(
                String(
                  bValue
                )
              )

            : String(
                bValue
              ).localeCompare(
                String(
                  aValue
                )
              )
        );

      }
    );

  }


  const topResults =
    useMemo(
      () => {

        return sortResults(
          simulationResults?.results
        ).slice(
          0,
          300
        );

      },
      [
        simulationResults,
        resultSort,
      ]
    );


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


    return (
      `${
        number >
        0
          ? "+"
          : ""
      }$${number.toFixed(4)}`
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
      `${number.toFixed(2)}%`
    );

  }


  function getProfitFactor(
    value
  ) {

    if (
      value ===
        Infinity ||
      value ===
        "Infinity"
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

    const total =
      Number(
        seconds
      ) ||
      0;


    const minutes =
      Math.floor(
        total /
        60
      );


    const secs =
      total %
      60;


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
  // RENDER
  // ==========================================================

  return (

    <div className="app-page">


      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="app-header">

        <div>

          <h1>
            Strategy Tester
          </h1>

          <p>
            Automatic Cascade + Full Optimizer
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
            activeTab ===
            "simulation"
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


      {/* ======================================================
          MARKET
      ====================================================== */}

      {activeTab ===
        "simulation" && (

        <>


          <section className="panel">

            <h2>
              Market
            </h2>

            <p className="muted">

              Choose the market and historical period.

            </p>


            <div className="form-grid">


              <Field
                label="Coin"
                value={
                  simulationSettings
                    .symbol
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
                  simulationSettings
                    .days
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


            <div className="simulation-actions">


              <button
                className="secondary-button"
                disabled={
                  cascadeRunning ||
                  simulationLoading
                }
                onClick={
                  loadPineDefaults
                }
              >

                Reset Defaults

              </button>


              <button
                className={
                  cascadeRunning
                    ? "cascade-button running"
                    : "cascade-button"
                }
                disabled={
                  cascadeRunning ||
                  simulationLoading
                }
                onClick={
                  runAutomaticCascade
                }
              >

                <span className="rocket-icon">
                  🚀
                </span>


                <span>

                  {
                    cascadeRunning

                      ? `Cascade ${cascadeProgress}%`

                      : "Automatic Cascade"

                  }

                </span>

              </button>

            </div>

          </section>


          {/* ====================================================
              CASCADE ERROR
          ==================================================== */}

          {cascadeError && (

            <ErrorBox
              message={
                cascadeError
              }
            />

          )}


          {/* ====================================================
              CASCADE RESULTS
          ==================================================== */}

          {cascadeResults && (

            <section className="panel cascade-panel">

              <div className="results-header">

                <div>

                  <span className="step-badge">
                    CASCADE COMPLETE
                  </span>


                  <h2>
                    Best Values Found
                  </h2>


                  <p className="muted">

                    These values were discovered
                    automatically. The large optimizer
                    below is now populated around them,
                    but you can manually change every range.

                  </p>

                </div>

              </div>


              {/* ==============================================
                  COMPACT TABLE
              ============================================== */}

              <div className="cascade-table-wrapper">

                <table>

                  <thead>

                    <tr>

                      <th>
                        Parameter
                      </th>

                      <th>
                        Best
                      </th>

                      <th>
                        P&L
                      </th>

                      <th>
                        Trades
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {
                      cascadeResults.results.map(
                        result => (

                          <tr
                            key={
                              result.parameter
                            }
                          >

                            <td>

                              <strong>
                                {
                                  result.label
                                }
                              </strong>

                            </td>


                            <td>

                              <strong>
                                {
                                  result.value
                                }
                              </strong>

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

                              <strong>
                                {
                                  result.totalTrades
                                }
                              </strong>

                            </td>

                          </tr>

                        )
                      )
                    }

                  </tbody>

                </table>

              </div>


              {/* ==============================================
                  SIMPLE BEST VALUES
              ============================================== */}

              <div className="cascade-best-values">


                <CascadeValue
                  label="EMA"
                  value={
                    cascadeResults
                      .bestValues
                      .emaLength
                  }
                />


                <CascadeValue
                  label="SMA"
                  value={
                    cascadeResults
                      .bestValues
                      .smaLength
                  }
                />


                <CascadeValue
                  label="KC Length"
                  value={
                    cascadeResults
                      .bestValues
                      .keltnerLength
                  }
                />


                <CascadeValue
                  label="KC Mult"
                  value={
                    cascadeResults
                      .bestValues
                      .keltnerMultiplier
                  }
                />


                <CascadeValue
                  label="ATR"
                  value={
                    cascadeResults
                      .bestValues
                      .atrLength
                  }
                />


                <CascadeValue
                  label="Stoch Length"
                  value={
                    cascadeResults
                      .bestValues
                      .stochasticLength
                  }
                />


                <CascadeValue
                  label="Stoch Smooth"
                  value={
                    cascadeResults
                      .bestValues
                      .stochasticSmoothing
                  }
                />


                <CascadeValue
                  label="MACD Fast"
                  value={
                    cascadeResults
                      .bestValues
                      .macdFast
                  }
                />


                <CascadeValue
                  label="MACD Slow"
                  value={
                    cascadeResults
                      .bestValues
                      .macdSlow
                  }
                />


                <CascadeValue
                  label="MACD Signal"
                  value={
                    cascadeResults
                      .bestValues
                      .macdSignal
                  }
                />


                <CascadeValue
                  label="TP ATR"
                  value={
                    cascadeResults
                      .bestValues
                      .tpAtr
                  }
                />

              </div>

            </section>

          )}


          {/* ====================================================
              FULL OPTIMIZER
          ==================================================== */}

          <section className="panel">

            <h2>
              Full Simulation Optimizer
            </h2>


            <p className="muted">

              After the cascade, these ranges are
              automatically narrowed around the discovered
              values. You can manually change them.

            </p>


            {/* ================================================
                COMBINATION ESTIMATE
            ================================================ */}

            <div
              className={
                fullSimulationTooLarge
                  ? "optimization-estimate optimization-estimate-danger"
                  : "optimization-estimate optimization-estimate-safe"
              }
            >

              <div>

                <span>
                  Estimated combinations
                </span>


                <strong>
                  {
                    fullCombinationCount.toLocaleString()
                  }
                </strong>

              </div>


              <div className="estimate-limit">

                Maximum allowed:

                {" "}

                <strong>
                  {
                    MAX_COMBINATIONS.toLocaleString()
                  }
                </strong>

              </div>


              {
                fullSimulationTooLarge

                  ? (

                    <div className="optimization-warning">

                      ⚠️ This configuration is too large.

                      <br />

                      Reduce the ranges before running
                      the full simulation.

                    </div>

                  )

                  : (

                    <div className="optimization-safe">

                      ✓ Safe to run.

                    </div>

                  )
              }

            </div>


            {/* ================================================
                PARAMETER RANGES
            ================================================ */}

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
                label="TP ATR"
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
                label="SL ATR"
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


            {/* ================================================
                RUN
            ================================================ */}

            <div className="simulation-actions">

              <button
                className="primary-button"
                disabled={
                  simulationLoading ||
                  cascadeRunning ||
                  fullSimulationTooLarge
                }
                onClick={
                  runSimulation
                }
              >

                {
                  fullSimulationTooLarge

                    ? "Too Many Combinations"

                    : simulationLoading

                      ? "Simulation Running..."

                      : "Run Full Simulation"
                }

              </button>

            </div>

          </section>


          {/* ====================================================
              LOADING
          ==================================================== */}

          {
            (
              cascadeRunning ||
              simulationLoading
            ) && (

              <section className="panel loading-panel">

                <div className="loading-header">

                  <h2>

                    {
                      cascadeRunning
                        ? "Automatic Cascade"
                        : "Full Simulation"
                    }

                  </h2>


                  <strong>

                    {
                      cascadeRunning

                        ? `${cascadeProgress}%`

                        : formatElapsed(
                            simulationElapsed
                          )

                    }

                  </strong>

                </div>


                <div className="progress-bar">

                  <div
                    className="progress-bar-fill"
                    style={
                      cascadeRunning
                        ? {
                            width:
                              `${cascadeProgress}%`,
                          }
                        : undefined
                    }
                  />

                </div>


                <p className="muted">

                  {
                    cascadeRunning

                      ? "Testing one parameter at a time and carrying the winner into the next step."

                      : `Running ${fullCombinationCount.toLocaleString()} combinations.`
                  }

                </p>

              </section>

            )
          }


          {/* ====================================================
              FULL SIMULATION ERROR
          ==================================================== */}

          {simulationError && (

            <ErrorBox
              message={
                simulationError
              }
            />

          )}


          {/* ====================================================
              FULL SUMMARY
          ==================================================== */}

          {simulationResults && (

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
                  title="Tests"
                  value={
                    Number(
                      simulationResults.totalCombinations ||
                      0
                    ).toLocaleString()
                  }
                />


                <ResultCard
                  title="Completed"
                  value={
                    Number(
                      simulationResults.completed ||
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
                      ? simulationResults
                          .results.length
                      : 0
                  }
                />


              </div>

            </section>

          )}


          {/* ====================================================
              TOP 300
          ==================================================== */}

          {simulationResults && (

            <section className="panel">

              <div className="results-header">

                <div>

                  <h2>
                    Top 300 Results
                  </h2>

                  <p className="muted">

                    Click a column to sort.
                    Default: highest number of trades.

                  </p>

                </div>

              </div>


              <TableWrapper>

                <table>

                  <thead>

                    <tr>

                      <th>
                        Rank
                      </th>


                      <SortableHeader
                        field="netProfit"
                        label="Net P&L"
                        sort={
                          resultSort
                        }
                        onSort={
                          handleResultSort
                        }
                      />


                      <SortableHeader
                        field="profitFactor"
                        label="PF"
                        sort={
                          resultSort
                        }
                        onSort={
                          handleResultSort
                        }
                      />


                      <SortableHeader
                        field="winRate"
                        label="Win Rate"
                        sort={
                          resultSort
                        }
                        onSort={
                          handleResultSort
                        }
                      />


                      <SortableHeader
                        field="totalTrades"
                        label="Trades"
                        sort={
                          resultSort
                        }
                        onSort={
                          handleResultSort
                        }
                      />


                      <SortableHeader
                        field="maxDrawdown"
                        label="Drawdown"
                        sort={
                          resultSort
                        }
                        onSort={
                          handleResultSort
                        }
                      />


                      <th>
                        EMA
                      </th>


                      <th>
                        SMA
                      </th>


                      <th>
                        KC
                      </th>


                      <th>
                        ATR
                      </th>


                      <th>
                        Stoch
                      </th>


                      <th>
                        MACD
                      </th>


                      <th>
                        TP
                      </th>


                      <th>
                        SL
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {
                      topResults.map(
                        (
                          result,
                          index
                        ) => (

                          <tr
                            key={
                              [
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
                              ].join("-")
                            }
                          >

                            <td>

                              <strong>
                                {
                                  index + 1
                                }
                              </strong>

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
                                  result.profitFactor
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
                                  result.totalTrades ??
                                  0
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
                                result.keltnerLength
                              }
                              /
                              {
                                result.keltnerMultiplier
                              }
                            </td>


                            <td>
                              {
                                result.atrLength
                              }
                            </td>


                            <td>
                              {
                                result.stochasticLength
                              }
                              /
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
                      )
                    }

                  </tbody>

                </table>

              </TableWrapper>

            </section>

          )}

        </>

      )}

    </div>

  );

}


// ============================================================
// CASCADE VALUE
// ============================================================

function CascadeValue({
  label,
  value,
}) {

  return (

    <div>

      <span>
        {label}
      </span>


      <strong>
        {value}
      </strong>

    </div>

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

  if (
    !setting
  ) {

    return null;

  }


  function handleChange(
    field,
    rawValue
  ) {

    let value =
      rawValue;


    if (
      field !==
      "enabled"
    ) {

      value =
        rawValue === ""
          ? ""
          : Number(
              rawValue
            );

    }


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
              Boolean(
                setting.enabled
              )
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
              setting.value ??
              ""
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
                setting.from ??
                ""
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
                setting.to ??
                ""
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
                setting.step ??
                ""
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


      {type ===
        "select" ? (

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

                {
                  option
                }

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
// SORTABLE HEADER
// ============================================================

function SortableHeader({
  field,
  label,
  sort,
  onSort,
}) {

  const active =
    sort.field ===
    field;


  const indicator =
    active

      ? (
          sort.direction ===
          "desc"
            ? "↓"
            : "↑"
        )

      : "↕";


  return (

    <th
      onClick={
        () =>
          onSort(
            field
          )
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

      {
        label
      }

      {" "}

      <span
        style={{
          opacity:
            active
              ? 1
              : 0.4,
        }}
      >

        {
          indicator
        }

      </span>

    </th>

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
        {
          title
        }
      </div>


      <div className="result-card-value">
        {
          value
        }
      </div>

    </div>

  );

}


// ============================================================
// TABLE WRAPPER
// ============================================================

function TableWrapper({
  children,
}) {

  return (

    <div className="table-wrapper">

      {
        children
      }

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

      {
        children
      }

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
        Error:
      </strong>

      {" "}

      {
        message
      }

    </div>

  );

}


export default App;

