import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/cars", (_req, res) => {
  res.json([
    { id: 1, name: "Toyota Corolla", pricePerDay: 40 },
    { id: 2, name: "Honda Civic", pricePerDay: 45 },
  ]);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
