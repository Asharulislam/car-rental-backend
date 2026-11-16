import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { Actor } from "../../core/constants/actor.js";
import { cancel, create, details, list } from "./booking.controller.js";

const router = Router();

// All booking routes are for logged-in customers, scoped to their own bookings.
router.use(authenticate, authorize(Actor.customer));

router.post("/", create);
router.get("/", list);
router.get("/:id", details);
router.patch("/:id/cancel", cancel);

export default router;
