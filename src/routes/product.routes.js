import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";

const router = Router();

router.route("/addProduct").post(
  upload.fields([
    {
      name: "productImage",
      maxCount: 3,
    },
  ]),
  addProduct
);

router.route("/getAllProducts").get(getAllProducts);
router.route("/updateProduct/:id").patch(
  upload.fields([
    {
      name: "productImage", // The field name expected by multer
      maxCount: 3,
    },
  ]),
  updateProduct
);
router.route("/getProductById/:id").get(getProductById);
router.route("/deleteProduct/:id").delete(deleteProduct);

export default router;
