import { Router } from "express";
import { profileViewController } from "../../controllers/ProfileViewController.js";

import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (req, res) => profileViewController.getViews(req, res));
router.post("/record", (req, res) => profileViewController.recordView(req, res));
router.post("/reset", requireAuth, (req, res) => profileViewController.resetViews(req, res));

export default router;
