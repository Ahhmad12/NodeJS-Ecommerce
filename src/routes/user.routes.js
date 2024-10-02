import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  registerUser,
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getUser,
  addAddress,
  updateUser,
  deleteAddress,
  updateAddress,
  getUserAllAddress,
  getUserAddressById,
  logout,
  refreshAccessToken,
} from "../controllers/user.controlller.js";
const router = Router();

// auth
router.route("/signUp").post(upload.single("avatar"), registerUser);
router.route("/signIn").post(loginUser);

// forgot password
router.route("/forgotPassword").post(forgotPassword);
router.route("/verifyOtp").post(verifyOtp);
router.route("/resetPassword").post(resetPassword);

// secured routes
router.route("/logout").post(verifyJWT, logout);
router.route("/refreshToken").post(refreshAccessToken);

router.route("/getUser").get(verifyJWT, getUser);
router.route("/addAddress").post(verifyJWT, addAddress);

router
  .route("/updateUser")
  .patch(verifyJWT, upload.single("avatar"), updateUser);

router.route("/deleteAddress/:id").delete(verifyJWT, deleteAddress);
router.route("/updateAddress/:id").patch(verifyJWT, updateAddress);
router.route("/getUserAllAddress").get(verifyJWT, getUserAllAddress);
router.route("/getUserAddress/:id").get(verifyJWT, getUserAddressById);

export default router;
