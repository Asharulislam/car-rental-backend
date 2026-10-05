import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { Actor } from "../../core/constants/actor.js";
import { adminLogin, login, me, refresh, signup } from "./auth.controller.js";

const router = Router();

// Customers sign up and log in. The admin only logs in, with the fixed
// ADMIN_EMAIL / ADMIN_PASSWORD from .env — there is no admin signup.
router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refresh);
router.get("/me", authenticate, authorize(Actor.customer), me);

router.post("/admin/login", adminLogin);

export default router;
