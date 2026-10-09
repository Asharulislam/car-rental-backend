import type { Request, Response } from "express";
import { getCarById, getCars } from "./car.service.js";
import { carIdSchema, listCarsSchema } from "./car.validation.js";

export async function getCarslist(req: Request, res: Response) {
  try {
    const parsed = listCarsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation failed",
        details: parsed.error.issues.map((i) => i.message),
      });
    }

    const result = await getCars(parsed.data);
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
}

export async function getCarDetails(req: Request, res: Response) {
  try {
    const parsed = carIdSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation failed",
        details: parsed.error.issues.map((i) => i.message),
      });
    }

    const car = await getCarById(parsed.data.id);
    return res.status(200).json(car);
  } catch (err: any) {
    if (err.message === "CAR_NOT_FOUND") {
      return res.status(404).json({ error: "car not found" });
    }
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
}
