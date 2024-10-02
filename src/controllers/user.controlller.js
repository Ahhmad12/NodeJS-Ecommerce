import { asyncHandler } from "../utilis/asyncHandler.js";
import { ApiError } from "../utilis/apiError.js";
import { User } from "../models/user.model.js";
import { Address } from "../models/address.model.js";
import {
  uploadOnCloudinary,
  deleleImageOnCloudinary,
} from "../utilis/cloudinary.js";
import { ApiResponse } from "../utilis/apiResponse.js";
import jwt from "jsonwebtoken";
import { generateOTP, generateUniqueHexString } from "../utilis/shared.js";
import { emailOtp } from "../utilis/email.service.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generate refresh and access tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;
  if ([email, password, fullName].some((fields) => fields?.trim() == "")) {
    throw new ApiError(400, "All Fields are required");
  }
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, "User from this email already exists");
  }
  const avatarLocalPath = req.file?.path;
  let avatar = "";
  if (avatarLocalPath) {
    avatar = await uploadOnCloudinary(avatarLocalPath);
  }
  const user = await User.create({
    fullName,
    email,
    password,
    avatar: avatar ? avatar?.url : null,
  });

  const createdUser = await User.findById(user?._id).select(
    "-password -refreshToken -authOtp -resetPasswordToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }
  return res
    .status(201)
    .json(
      new ApiResponse(200, createdUser, "user cresated scuccessfully", true)
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input fields
  if ([email, password].some((fields) => fields?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  // Find the user and populate the address field
  const user = await User.findOne({ email }).populate("address");
  if (!user) {
    throw new ApiError(404, "User not found!!!");
  }

  // Check if the password is correct
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Fetch the user with selected fields, populate the address, and exclude sensitive fields
  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken -authOtp -resetPasswordToken")
    .populate("address"); // Ensure the address is populated

  // Set cookie options
  const option = {
    httpOnly: true,
    secure: true, // This should be true in production (on HTTPS)
  };

  // Return response with user details and tokens
  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully",
        true
      )
    );
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(409, "username or email is required");
  }
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const otp = await generateOTP();

  await emailOtp(user, otp);
  await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        authOtp: otp,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, [], "Otp is sent to your email"));
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { authOtp } = req?.body;
  const user = await User.findOne({ authOtp });

  if (!user) {
    throw new ApiError(409, "Otp is invalid");
  }
  const resetPasswordToken = await generateUniqueHexString();
  await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        resetPasswordToken: resetPasswordToken,
        authOtp: null,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        resetPasswordToken,
        "use this token to change your password"
      )
    );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword, resetPasswordToken } = req?.body;
  const user = await User.findOne({ resetPasswordToken });

  if (!user) {
    throw new ApiError(409, "Reset Password Token is invalid");
  }

  user.password = newPassword;
  user.resetPasswordToken = null;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully", true));
});

const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const option = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "user logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id).select();

    if (!user) {
      throw new ApiError(401, "Inavlid user request");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user?._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed successfully",
          true
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invlaid refresh token");
  }
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("address");

  if (!user) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "User not found", false));
  }
  const {
    password,
    refreshToken,
    resetPasswordToken,
    authOtp,
    ...userWithoutPassword
  } = user._doc || user;
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        userWithoutPassword,
        "Current user fetched successfully",
        true
      )
    );
});

const addAddress = asyncHandler(async (req, res) => {
  const { streetAddress, town, city, country, zipCode, addressType } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "User not found", false));
  }
  // Check if the user already has 5 addresses
  if (user.address.length >= 5) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "You cannot add more than 5 addresses",
          false
        )
      );
  }
  // Create a new address document
  const newAddress = await Address.create({
    userId: user._id,
    streetAddress,
    town,
    city,
    country,
    zipCode,
    addressType,
  });

  // Save the new address to the database
  const savedAddress = await newAddress.save();
  user.address.push(newAddress);
  await user.save();

  return res
    .status(201)
    .json(
      new ApiResponse(201, savedAddress, "Address added successfully", true)
    );
});

const updateUser = asyncHandler(async (req, res) => {
  const { fullName } = req.body;
  const avatarLocalPath = req.file?.path;
  if (!fullName && !avatarLocalPath) {
    throw new ApiError(409, "Fields are required to update user");
  }
  let avatar = "";
  if (avatarLocalPath) {
    avatar = await uploadOnCloudinary(avatarLocalPath);
  }
  if (!avatar?.url && avatarLocalPath) {
    throw new ApiError(409, "Error while uploading a avatar");
  }

  if (avatar?.url) {
    await deleleImageOnCloudinary(req?.user?.avatar);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar ? avatar?.url : null,
        fullName,
      },
    },
    { new: true }
  ).select({
    password: 0,
    resetPasswordToken: 0,
    authOtp: 0,
    refreshToken: 0,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "User avatar is updated successfully", true)
    );
});

const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id).populate("address");
  if (!user) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "User not found", false));
  }

  // Find the address in the user's address array
  const addressIndex = user.address.findIndex(
    (address) => address._id.toString() === id
  );
  if (addressIndex === -1) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Address not found", false));
  }

  // Remove the address from the user's address array
  user.address.splice(addressIndex, 1);

  // Save the user after removing the address
  await user.save();

  // Delete the address document from the Address model
  await Address.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Address deleted successfully", true));
});

const updateAddress = asyncHandler(async (req, res) => {
  const { streetAddress, town, city, country, zipCode, addressType } = req.body;
  const { id } = req.params;

  if (
    !streetAddress &&
    !town &&
    !city &&
    !country &&
    !zipCode &&
    !addressType
  ) {
    throw new ApiError(400, "Fields are required");
  }

  // Find the user and populate their address
  const user = await User.findById(req.user._id).populate("address");
  if (!user) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "User not found", false));
  }

  // Find the index of the address to be updated
  const addressIndex = user.address.findIndex(
    (address) => address._id.toString() === id
  );

  if (addressIndex === -1) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Address not found", false));
  }

  // Update the address in the Address model
  const updatedAddress = await Address.findByIdAndUpdate(
    id,
    {
      streetAddress,
      town,
      city,
      country,
      zipCode,
      addressType,
    },
    { new: true } // Return the updated document
  );

  if (!updatedAddress) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Address update failed", false));
  }

  // Update the user's address array (optional)
  user.address[addressIndex] = updatedAddress;

  // Save the user (if you want to maintain the user object in sync)
  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedAddress, "Address updated successfully", true)
    );
});

const getUserAllAddress = asyncHandler(async (req, res) => {
  // Find the user and populate their address field
  const user = await User.findById(req.user._id).populate("address");

  if (!user) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "User not found", false));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.address,
        "Addresses retrieved successfully",
        true
      )
    );
});

const getUserAddressById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(req.user._id).populate("address");

  if (!user) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "User not found", false));
  }

  const address = user.address.find((address) => address._id.toString() === id);

  if (!address) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Address not found", false));
  }

  // Return the found address
  return res
    .status(200)
    .json(
      new ApiResponse(200, address, "Address retrieved successfully", true)
    );
});

export {
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
};
