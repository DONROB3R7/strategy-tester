import { useState } from "react";
import "./App.css";

function App() {
  const [settings, setSettings] = useState({
    symbol: "BTCUSDT",
    timeframe: "4H",
    balance: 100,
    risk: 1,
    riskReward: 2,
    cooldown: 0,
  });

  function updateSetting(name, value) {
    setSettings({
      ...settings,
      [name]: value,
    });
  }

  async function runBacktest() {
    const response = await fetch("http://localhost:3001/api/backtest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });

    const data = await response.json();

    console.log("Backend response:", data);
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Strategy Tester</h1>
        <p>Backtest your trading strategies</p>
      </header>

      <main>
        <section className="panel">
          <h2>Backtest Settings</h2>

          <div className="settings-grid">
            <div className="field">
              <label>Symbol</label>
              <select
                value={settings.symbol}
                onChange={(e) =>
                  updateSetting("symbol", e.target.value)
                }
              >
                <option>BTCUSDT</option>
                <option>ETHUSDT</option>
                <option>SOLUSDT</option>
              </select>
            </div>

            <div className="field">
              <label>Timeframe</label>
              <select
                value={settings.timeframe}
                onChange={(e) =>
                  updateSetting("timeframe", e.target.value)
                }
              >
                <option>15m</option>
                <option>1H</option>
                <option>4H</option>
                <option>1D</option>
              </select>
            </div>

            <div className="field">
              <label>Starting Balance</label>
              <input
                type="number"
                value={settings.balance}
                onChange={(e) =>
                  updateSetting("balance", Number(e.target.value))
                }
              />
            </div>

            <div className="field">
              <label>Risk per Trade (%)</label>
              <input
                type="number"
                value={settings.risk}
                onChange={(e) =>
                  updateSetting("risk", Number(e.target.value))
                }
              />
            </div>

            <div className="field">
              <label>Risk : Reward</label>
              <input
                type="number"
                value={settings.riskReward}
                onChange={(e) =>
                  updateSetting("riskReward", Number(e.target.value))
                }
              />
            </div>

            <div className="field">
              <label>Cooldown (bars)</label>
              <input
                type="number"
                value={settings.cooldown}
                onChange={(e) =>
                  updateSetting("cooldown", Number(e.target.value))
                }
              />
            </div>
          </div>

          <button className="run-button" onClick={runBacktest}>
            Run Backtest
          </button>
        </section>

        <section className="panel">
          <h2>Results</h2>

          <div className="results-grid">
            <div className="result">
              <span>Balance</span>
              <strong>$10,000</strong>
            </div>

            <div className="result">
              <span>Return</span>
              <strong>0%</strong>
            </div>

            <div className="result">
              <span>Trades</span>
              <strong>0</strong>
            </div>

            <div className="result">
              <span>Win Rate</span>
              <strong>0%</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;