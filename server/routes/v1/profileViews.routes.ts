import { Router } from "express";
import { profileViewController } from "../../controllers/ProfileViewController.js";

const router = Router();

router.get("/", (req, res) => profileViewController.getViews(req, res));
router.post("/record", (req, res) => profileViewController.recordView(req, res));
router.post("/reset", (req, res) => profileViewController.resetViews(req, res));

export default router;
