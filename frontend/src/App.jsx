import "./App.css";

function App() {
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
              <select>
                <option>BTCUSDT</option>
                <option>ETHUSDT</option>
                <option>SOLUSDT</option>
              </select>
            </div>

            <div className="field">
              <label>Timeframe</label>
              <select>
                <option>15m</option>
                <option>1H</option>
                <option>4H</option>
                <option>1D</option>
              </select>
            </div>

            <div className="field">
              <label>Starting Balance</label>
              <input type="number" defaultValue="10000" />
            </div>

            <div className="field">
              <label>Risk per Trade (%)</label>
              <input type="number" defaultValue="1" />
            </div>

            <div className="field">
              <label>Risk : Reward</label>
              <input type="number" defaultValue="2" />
            </div>

            <div className="field">
              <label>Cooldown (bars)</label>
              <input type="number" defaultValue="0" />
            </div>
          </div>

          <button className="run-button">
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