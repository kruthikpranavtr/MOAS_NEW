import { Router } from "express";
import { companyController } from "../../controllers/CompanyController.js";
import { validateBody } from "../../middleware/validator.js";

import { requireAuth, requireAdmin } from "../../middleware/auth.js";

const router = Router();

router.get("/", (req, res) => companyController.getCompanies(req, res));
router.get("/top", (req, res) => companyController.getTopCompanies(req, res));
router.get("/ratings", (req, res) => companyController.getRatings(req, res));
router.post("/ratings", validateBody(["companyId", "rating"]), (req, res) =>
  companyController.postRating(req, res)
);
router.patch("/:id/verify", requireAuth, requireAdmin, (req, res) =>
  companyController.verifyCompany(req, res)
);

export default router;
