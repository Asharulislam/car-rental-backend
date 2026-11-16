import express from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import carRoutes from "./modules/car/car.routes.js";
import bookingRoutes from "./modules/booking/booking.routes.js";


const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/cars", carRoutes);

app.use("/auth", authRoutes);

app.use("/bookings", bookingRoutes);

export default app;
