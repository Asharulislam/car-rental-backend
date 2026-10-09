import type { Request, Response } from "express";
import { getCars } from "./car.service.js";

export async function carslist(_req: Request, res: Response) {
  try {
    const cars = await getCars();
    return res.status(200).json(cars);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
}