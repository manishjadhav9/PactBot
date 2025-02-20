import express from "express";
import passport from "passport";
import { getCurrentUser, handleLogout } from "../controllers/auth.controller";
import { handleErrors } from "../middleware/errors";

const router = express.Router();

router.get("/current-user", handleErrors(getCurrentUser));

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    successRedirect: "/dashboard",
  })
);

router.get("/logout", handleLogout);

export default router;