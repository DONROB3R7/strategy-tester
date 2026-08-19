import { useState } from "react";

function App() {
  const [settings, setSettings] = useState({
    symbol: "BTCUSDT",
    timeframe: "15m",

    balance: 100,
    positionSize: 100,

    smaLength: 25,
    emaLength: 200,

    keltnerLength: 10,
    keltnerMultiplier: 2,

    atrLength: 15,

    stochasticLength: 10,
    stochasticSmooth: 1,

    macdFast: 4,
    macdSlow: 34,
    macdSignal: 5,

    tpATRMultiplier: 15,
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;

    const numericFields = [
      "balance",
      "positionSize",
      "smaLength",
      "emaLength",
      "keltnerLength",
      "keltnerMultiplier",
      "atrLength",
      "stochasticLength",
      "stochasticSmooth",
      "macdFast",
      "macdSlow",
      "macdSignal",
      "tpATRMultiplier",
    ];

    setSettings((previous) => ({
      ...previous,
      [name]: numericFields.includes(name)
        ? Number(value)
        : value,
    }));
  }

  async function runBacktest() {
    try {
      setLoading(true);
      setResults(null);
      setError(null);

      const response = await fetch(
        "http://localhost:3001/api/backtest",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Backtest failed");
      }

      console.log("Backtest results:", data.results);

      setResults(data.results);
    } catch (error) {
      console.error("Backtest error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(value) {
    return Number(value).toFixed(2);
  }

  function formatMoney(value) {
    const number = Number(value);

    if (Math.abs(number) < 0.005) {
      return "$0.00";
    }

    return `$${number.toFixed(2)}`;
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  return (
    <div
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Strategy Tester</h1>

      <p>
        EMA200 + MACD + Stochastic + Keltner
      </p>

      <h2 style={{ marginTop: "35px" }}>Market</h2>

      <div style={sectionGridStyle}>
        <Field
          label="Symbol"
          name="symbol"
          value={settings.symbol}
          onChange={handleChange}
          type="select"
          options={[
            "BTCUSDT",
            "ETHUSDT",
            "SOLUSDT",
            "BNBUSDT",
          ]}
        />

        <Field
          label="Timeframe"
          name="timeframe"
          value={settings.timeframe}
          onChange={handleChange}
          type="select"
          options={[
            "15m",
            "1H",
            "4H",
            "1D",
          ]}
        />

        <Field
          label="Starting Balance ($)"
          name="balance"
          value={settings.balance}
          onChange={handleChange}
          type="number"
        />

        <Field
          label="Position Size ($)"
          name="positionSize"
          value={settings.positionSize}
          onChange={handleChange}
          type="number"
        />
      </div>

      <h2 style={{ marginTop: "35px" }}>
        Moving Averages
      </h2>

      <div style={sectionGridStyle}>
        <Field
          label="SMA Length"
          name="smaLength"
          value={settings.smaLength}
          onChange={handleChange}
          type="number"
        />

        <Field
          label="EMA Length"
          name="emaLength"
          value={settings.emaLength}
          onChange={handleChange}
          type="number"
        />
      </div>

      <h2 style={{ marginTop: "35px" }}>
        Keltner Channel
      </h2>

      <div style={sectionGridStyle}>
        <Field
          label="Length"
          name="keltnerLength"
          value={settings.keltnerLength}
          onChange={handleChange}
          type="number"
        />

        <Field
          label="Multiplier"
          name="keltnerMultiplier"
          value={settings.keltnerMultiplier}
          onChange={handleChange}
          type="number"
          step="0.1"
        />
      </div>

      <h2 style={{ marginTop: "35px" }}>
        ATR / Take Profit
      </h2>

      <div style={sectionGridStyle}>
        <Field
          label="ATR Length"
          name="atrLength"
          value={settings.atrLength}
          onChange={handleChange}
          type="number"
        />

        <Field
          label="TP ATR Multiplier"
          name="tpATRMultiplier"
          value={settings.tpATRMultiplier}
          onChange={handleChange}
          type="number"
          step="0.1"
        />
      </div>

      <h2 style={{ marginTop: "35px" }}>
        Stochastic
      </h2>

      <div style={sectionGridStyle}>
        <Field
          label="%K Length"
          name="stochasticLength"
          value={settings.stochasticLength}
          onChange={handleChange}
          type="number"
        />

        <Field
          label="%K Smoothing"
          name="stochasticSmooth"
          value={settings.stochasticSmooth}
          onChange={handleChange}
          type="number"
        />
      </div>

      <h2 style={{ marginTop: "35px" }}>
        MACD
      </h2>

      <div style={sectionGridStyle}>
        <Field
          label="Fast Length"
          name="macdFast"
          value={settings.macdFast}
          onChange={handleChange}
          type="number"
        />

        <Field
          label="Slow Length"
          name="macdSlow"
          value={settings.macdSlow}
          onChange={handleChange}
          type="number"
        />

        <Field
          label="Signal Length"
          name="macdSignal"
          value={settings.macdSignal}
          onChange={handleChange}
          type="number"
        />
      </div>

      <div
        style={{
          marginTop: "35px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          background: "#fafafa",
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          Strategy Rules
        </h3>

        <p>
          <strong>LONG:</strong> Close above SMA
          25 and EMA 200, inside the Keltner
          Channel, MACD histogram below 0, and
          Stochastic below 50.
        </p>

        <p>
          <strong>SHORT:</strong> Close below SMA
          25 and EMA 200, inside the Keltner
          Channel, MACD histogram above 0, and
          Stochastic above 50.
        </p>

        <p>
          <strong>Take Profit:</strong> ATR × TP
          multiplier.
        </p>

        <p>
          <strong>Stop Loss:</strong> None.
        </p>

        <p>
          <strong>Opposite Signal:</strong> Close
          the current position and open the
          opposite position.
        </p>

        <p style={{ marginBottom: 0 }}>
          <strong>Cooldown:</strong> None.
        </p>
      </div>

      <button
        onClick={runBacktest}
        disabled={loading}
        style={{
          marginTop: "25px",
          padding: "12px 24px",
          fontSize: "16px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Running..." : "Run Backtest"}
      </button>

      {error && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            border: "1px solid red",
            borderRadius: "6px",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (
        <>
          <div style={{ marginTop: "40px" }}>
            <h2>Backtest Results</h2>

            <div style={resultsGridStyle}>
              <ResultCard
                title="Starting Balance"
                value={formatMoney(results.startingBalance)}
              />

              <ResultCard
                title="Ending Balance"
                value={formatMoney(results.endingBalance)}
              />

              <ResultCard
                title="Net Profit"
                value={formatMoney(results.netProfit)}
              />

              <ResultCard
                title="Total Trades"
                value={results.totalTrades}
              />

              <ResultCard
                title="Winners"
                value={results.winners}
              />

              <ResultCard
                title="Losers"
                value={results.losers}
              />

              <ResultCard
                title="Win Rate"
                value={`${Number(results.winRate).toFixed(2)}%`}
              />

              <ResultCard
                title="Profit Factor"
                value={
                  results.profitFactor === Infinity
                    ? "∞"
                    : Number(results.profitFactor).toFixed(2)
                }
              />
            </div>
          </div>

          <div style={{ marginTop: "50px" }}>
            <h2>Trades</h2>

            {!results.trades ||
            results.trades.length === 0 ? (
              <p>No completed trades.</p>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  marginTop: "15px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "1050px",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Direction</th>
                      <th style={thStyle}>Entry Time</th>
                      <th style={thStyle}>Exit Time</th>
                      <th style={thStyle}>Entry</th>
                      <th style={thStyle}>Exit</th>
                      <th style={thStyle}>TP</th>
                      <th style={thStyle}>Result</th>
                      <th style={thStyle}>Exit Reason</th>
                      <th style={thStyle}>P&L</th>
                    </tr>
                  </thead>

                  <tbody>
                    {results.trades.map(
                      (trade, index) => (
                        <tr key={index}>
                          <td style={tdStyle}>
                            {index + 1}
                          </td>

                          <td style={tdStyle}>
                            {trade.direction}
                          </td>

                          <td style={tdStyle}>
                            {formatTime(trade.entryTime)}
                          </td>

                          <td style={tdStyle}>
                            {formatTime(trade.exitTime)}
                          </td>

                          <td style={tdStyle}>
                            {formatPrice(trade.entry)}
                          </td>

                          <td style={tdStyle}>
                            {formatPrice(trade.exit)}
                          </td>

                          <td style={tdStyle}>
                            {formatPrice(trade.takeProfit)}
                          </td>

                          <td style={tdStyle}>
                            {trade.result}
                          </td>

                          <td style={tdStyle}>
                            {trade.exitReason || "-"}
                          </td>

                          <td style={tdStyle}>
                            {formatMoney(trade.pnl)}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type,
  options,
  step,
}) {
  return (
    <div>
      <label>
        {label}
      </label>

      {type === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          style={inputStyle}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          min="0"
          step={step || "1"}
          style={inputStyle}
        />
      )}
    </div>
  );
}

function ResultCard({ title, value }) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "20px",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "8px",
  marginTop: "5px",
};

const sectionGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "15px",
  marginTop: "20px",
};

const resultsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "15px",
  marginTop: "20px",
};

const thStyle = {
  border: "1px solid #ddd",
  padding: "10px",
  textAlign: "left",
  background: "#f5f5f5",
};

const tdStyle = {
  border: "1px solid #ddd",
  padding: "10px",
};

export default App;