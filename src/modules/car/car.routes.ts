import { Router } from "express";
import { getCarDetails, getCarslist } from "./car.controller.js";

const router = Router();

router.get("/", getCarslist);
router.get("/:id", getCarDetails);

export default router;
