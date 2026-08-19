import { useState } from "react";

function App() {
  const [settings, setSettings] = useState({
    symbol: "BTCUSDT",
    timeframe: "15m",
    balance: 100,
    risk: 1,
    riskReward: 2,
    cooldown: 0,

    // KAMA settings
    kamaLength: 200,
    kamaFast: 2,
    kamaSlow: 30,
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;

    const numericFields = [
      "balance",
      "risk",
      "riskReward",
      "cooldown",
      "kamaLength",
      "kamaFast",
      "kamaSlow",
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
        throw new Error(
          data.error || "Backtest failed"
        );
      }

      console.log(
        "Backtest results:",
        data.results
      );

      setResults(data.results);
    } catch (error) {
      console.error(
        "Backtest error:",
        error
      );

      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(value) {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(Number(value))
    ) {
      return "-";
    }

    return Number(value).toFixed(2);
  }

  function formatMoney(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "-";
    }

    // Prevent "-0.00"
    if (Math.abs(number) < 0.005) {
      return "$0.00";
    }

    return `$${number.toFixed(2)}`;
  }

  function formatTime(timestamp) {
    if (!timestamp) {
      return "-";
    }

    return new Date(
      timestamp
    ).toLocaleString();
  }

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <h1>Strategy Tester</h1>

      <p>
        Binance Futures backtesting
      </p>

      {/* ==================================================
          SETTINGS
          ================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "15px",
          marginTop: "30px",
        }}
      >
        {/* SYMBOL */}

        <div>
          <label>Symbol</label>

          <select
            name="symbol"
            value={settings.symbol}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="BTCUSDT">
              BTCUSDT
            </option>

            <option value="ETHUSDT">
              ETHUSDT
            </option>

            <option value="SOLUSDT">
              SOLUSDT
            </option>

            <option value="BNBUSDT">
              BNBUSDT
            </option>
          </select>
        </div>

        {/* TIMEFRAME */}

        <div>
          <label>Timeframe</label>

          <select
            name="timeframe"
            value={settings.timeframe}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="15m">
              15m
            </option>

            <option value="1H">
              1H
            </option>

            <option value="4H">
              4H
            </option>

            <option value="1D">
              1D
            </option>
          </select>
        </div>

        {/* BALANCE */}

        <div>
          <label>Balance</label>

          <input
            type="number"
            name="balance"
            value={settings.balance}
            onChange={handleChange}
            min="0"
            step="1"
            style={inputStyle}
          />
        </div>

        {/* RISK */}

        <div>
          <label>Risk %</label>

          <input
            type="number"
            name="risk"
            value={settings.risk}
            onChange={handleChange}
            min="0"
            step="0.1"
            style={inputStyle}
          />
        </div>

        {/* RISK REWARD */}

        <div>
          <label>Risk / Reward</label>

          <input
            type="number"
            name="riskReward"
            value={settings.riskReward}
            onChange={handleChange}
            min="0.1"
            step="0.1"
            style={inputStyle}
          />
        </div>

        {/* COOLDOWN */}

        <div>
          <label>Cooldown (bars)</label>

          <input
            type="number"
            name="cooldown"
            value={settings.cooldown}
            onChange={handleChange}
            min="0"
            step="1"
            style={inputStyle}
          />
        </div>

        {/* KAMA LENGTH */}

        <div>
          <label>KAMA Length</label>

          <input
            type="number"
            name="kamaLength"
            value={settings.kamaLength}
            onChange={handleChange}
            min="1"
            step="1"
            style={inputStyle}
          />
        </div>

        {/* KAMA FAST */}

        <div>
          <label>KAMA Fast</label>

          <input
            type="number"
            name="kamaFast"
            value={settings.kamaFast}
            onChange={handleChange}
            min="1"
            step="1"
            style={inputStyle}
          />
        </div>

        {/* KAMA SLOW */}

        <div>
          <label>KAMA Slow</label>

          <input
            type="number"
            name="kamaSlow"
            value={settings.kamaSlow}
            onChange={handleChange}
            min="1"
            step="1"
            style={inputStyle}
          />
        </div>
      </div>

      {/* ==================================================
          RUN BUTTON
          ================================================== */}

      <button
        onClick={runBacktest}
        disabled={loading}
        style={{
          marginTop: "25px",
          padding: "12px 24px",
          fontSize: "16px",
          cursor: loading
            ? "not-allowed"
            : "pointer",
        }}
      >
        {loading
          ? "Running..."
          : "Run Backtest"}
      </button>

      {/* ==================================================
          ERROR
          ================================================== */}

      {error && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            border:
              "1px solid red",
          }}
        >
          <strong>
            Error:
          </strong>{" "}
          {error}
        </div>
      )}

      {/* ==================================================
          RESULTS
          ================================================== */}

      {results && (
        <>
          {/* ==================================================
              STATISTICS
              ================================================== */}

          <div
            style={{
              marginTop: "40px",
            }}
          >
            <h2>
              Backtest Results
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "15px",
                marginTop: "20px",
              }}
            >
              <ResultCard
                title="Starting Balance"
                value={formatMoney(
                  results.startingBalance
                )}
              />

              <ResultCard
                title="Ending Balance"
                value={formatMoney(
                  results.endingBalance
                )}
              />

              <ResultCard
                title="Net Profit"
                value={formatMoney(
                  results.netProfit
                )}
              />

              <ResultCard
                title="Return"
                value={`${Number(
                  results.returnPercent
                ).toFixed(2)}%`}
              />

              <ResultCard
                title="Total Trades"
                value={
                  results.totalTrades
                }
              />

              <ResultCard
                title="Winners"
                value={
                  results.winners
                }
              />

              <ResultCard
                title="Losers"
                value={
                  results.losers
                }
              />

              <ResultCard
                title="Win Rate"
                value={`${Number(
                  results.winRate
                ).toFixed(2)}%`}
              />

              <ResultCard
                title="Profit Factor"
                value={
                  results.profitFactor ===
                  Infinity
                    ? "∞"
                    : Number(
                        results.profitFactor
                      ).toFixed(2)
                }
              />

              <ResultCard
                title="Max Drawdown"
                value={`${Number(
                  results.maxDrawdown
                ).toFixed(2)}%`}
              />
            </div>
          </div>

          {/* ==================================================
              TRADE TABLE
              ================================================== */}

          <div
            style={{
              marginTop: "50px",
            }}
          >
            <h2>Trades</h2>

            {results.trades.length ===
            0 ? (
              <p>
                No completed trades.
              </p>
            ) : (
              <div
                style={{
                  overflowX:
                    "auto",
                  marginTop: "15px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                    minWidth:
                      "1200px",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={thStyle}
                      >
                        #
                      </th>

                      <th
                        style={thStyle}
                      >
                        Entry Candle
                      </th>

                      <th
                        style={thStyle}
                      >
                        Exit Candle
                      </th>

                      <th
                        style={thStyle}
                      >
                        Direction
                      </th>

                      <th
                        style={thStyle}
                      >
                        Entry Time
                      </th>

                      <th
                        style={thStyle}
                      >
                        Exit Time
                      </th>

                      <th
                        style={thStyle}
                      >
                        Entry
                      </th>

                      <th
                        style={thStyle}
                      >
                        Exit
                      </th>

                      <th
                        style={thStyle}
                      >
                        SL
                      </th>

                      <th
                        style={thStyle}
                      >
                        TP
                      </th>

                      <th
                        style={thStyle}
                      >
                        Result
                      </th>

                      <th
                        style={thStyle}
                      >
                        Exit Type
                      </th>

                      <th
                        style={thStyle}
                      >
                        P&L
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {results.trades.map(
                      (
                        trade,
                        index
                      ) => (
                        <tr
                          key={index}
                        >
                          <td
                            style={
                              tdStyle
                            }
                          >
                            {index +
                              1}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              trade.entryCandle
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              trade.exitCandle
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              trade.direction
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatTime(
                              trade.entryTime
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatTime(
                              trade.exitTime
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatPrice(
                              trade.entry
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatPrice(
                              trade.exit
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatPrice(
                              trade.stopLoss
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatPrice(
                              trade.takeProfit
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              trade.result
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              trade.exitType ||
                              "-"
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatMoney(
                              trade.pnl
                            )}
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


// ======================================================
// RESULT CARD
// ======================================================

function ResultCard({
  title,
  value,
}) {
  return (
    <div
      style={{
        border:
          "1px solid #ccc",
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


// ======================================================
// STYLES
// ======================================================

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "8px",
  marginTop: "5px",
};


const thStyle = {
  border:
    "1px solid #ddd",

  padding: "10px",

  textAlign: "left",

  background:
    "#f5f5f5",
};


const tdStyle = {
  border:
    "1px solid #ddd",

  padding: "10px",
};


export default App;