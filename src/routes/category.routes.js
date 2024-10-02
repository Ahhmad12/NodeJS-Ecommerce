import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/category.controller.js";

const router = Router();

router.route("/addCategory").post(upload.single("avatar"), addCategory);
router
  .route("/updateCategory/:id")
  .patch(upload.single("avatar"), updateCategory);

router.route("/getAllCategories").get(getAllCategories);
router.route("/getCategoryById/:id").get(getCategoryById);
router.route("/deleteCategory/:id").delete(deleteCategory);

export default router;
