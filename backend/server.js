const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Strategy Tester API is running",
  });
});

app.post("/api/backtest", (req, res) => {
  console.log("Backtest settings received:", req.body);

  res.json({
    success: true,
    message: "Backtest request received",
    settings: req.body,
  });
});

app.listen(PORT, () => {
  console.log(`Strategy Tester API running on http://localhost:${PORT}`);
});


