import express from "express";
import authRoutes from "./modules/auth/auth.routes.js";

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

app.use("/auth", authRoutes);

export default app;
