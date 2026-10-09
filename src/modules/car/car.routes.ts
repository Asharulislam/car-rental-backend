import { Router } from "express";
import { carslist } from "./car.controller.js";

const router = Router();

router.get("/", carslist);

export default router;