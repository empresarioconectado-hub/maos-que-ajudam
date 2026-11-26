import express from "express";

const app = express();
const PORT = 3000;

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`API executando em http://localhost:${PORT}`);
});
