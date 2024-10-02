import { User } from "../models/user.model.js";
import { ApiError } from "../utilis/apiError.js";
import { asyncHandler } from "../utilis/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req?.headers("Authorization").replace("Bearer ", "");
    if (!token) {
      throw new ApiError(401, "Unauthorize access to an operator");
    }
    const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodeToken._id);
    if (!user) {
      throw new ApiError(401, "Unauthorize access to an operator");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || "Unauthorize access to an operator"
    );
  }
});
