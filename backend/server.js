const express = require("express");
const cors = require("cors");

const { runBacktest } = require("./backtest");

const app = express();

const PORT = 3001;

app.use(cors());
app.use(express.json());

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
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Strategy Tester API is running",
  });
});

// ======================================================
// MARKET DATA
// ======================================================

app.get("/api/market-data", async (req, res) => {
  try {
    const symbol =
      req.query.symbol || "BTCUSDT";

    const interval =
      req.query.interval || "4h";

    const limit = 1000;

    const url =
      `https://fapi.binance.com/fapi/v1/klines` +
      `?symbol=${symbol}` +
      `&interval=${interval}` +
      `&limit=${limit}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Binance API error: ${response.status}`
      );
    }

    const data = await response.json();

    const candles =
      normalizeCandles(data);

    res.json({
      success: true,

      symbol,

      interval,

      count: candles.length,

      candles,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,

      error: error.message,
    });
  }
});

// ======================================================
// BACKTEST
// ======================================================

app.post("/api/backtest", async (req, res) => {
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
    // UI timeframe → Binance timeframe
    // --------------------------------------------------

    const intervalMap = {
      "15m": "15m",

      "1H": "1h",

      "4H": "4h",

      "1D": "1d",
    };

    const interval =
      intervalMap[timeframe];

    if (!interval) {
      return res.status(400).json({
        success: false,

        error:
          `Unsupported timeframe: ${timeframe}`,
      });
    }

    // --------------------------------------------------
    // Binance request
    // --------------------------------------------------

    const url =
      `https://fapi.binance.com/fapi/v1/klines` +
      `?symbol=${symbol}` +
      `&interval=${interval}` +
      `&limit=1000`;

    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Binance API error: ${response.status}`
      );
    }

    const data =
      await response.json();

    // --------------------------------------------------
    // Normalize candles
    // --------------------------------------------------

    const candles =
      normalizeCandles(data);

    console.log(
      `Fetched ${candles.length} candles for ${symbol} ${timeframe}`
    );

    // --------------------------------------------------
    // Run backtest
    // --------------------------------------------------

    const results =
      runBacktest(candles, {
        balance,
        risk,
        riskReward,
        cooldown,
      });

    // --------------------------------------------------
    // Console results
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
    // Response
    // --------------------------------------------------

    res.json({
      success: true,

      symbol,

      timeframe,

      settings: {
        balance,

        risk,

        riskReward,

        cooldown,
      },

      count: candles.length,

      results,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,

      error: error.message,
    });
  }
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {
  console.log(
    `Strategy Tester API running on http://localhost:${PORT}`
  );
});