import { asyncHandler } from "../utilis/asyncHandler.js";
import { ApiError } from "../utilis/apiError.js";
import { Category } from "../models/category.model.js";
import {
  uploadOnCloudinary,
  deleleImageOnCloudinary,
} from "../utilis/cloudinary.js";
import { ApiResponse } from "../utilis/apiResponse.js";
import { generateSlug } from "../utilis/shared.js";

const addCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const slug = await generateSlug(name);
  const existingCategory = await Category.findOne({ slug });
  if (existingCategory) {
    throw new ApiError(409, "Category already exists");
  }
  const avatarLocalPath = req.file?.path;
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (avatar) {
    throw new ApiError(500, "Error uploading image to Cloudinary");
  }
  const newCategory = new Category({
    name,
    slug,
    avatar: avatar.url,
  });
  await newCategory.save();
  return res
    .status(201)
    .json(
      new ApiResponse(201, newCategory, "Category added successfully", true)
    );
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  if (req.body.name) {
    const { name } = req.body;
    const slug = await generateSlug(name);

    const existingCategory = await Category.findOne({ slug });
    if (existingCategory && existingCategory._id.toString() !== id) {
      throw new ApiError(409, "Category with this slug already exists");
    }
    category.name = name;
    category.slug = slug;
  }
  if (req.file) {
    if (category.avatar) {
      await deleleImageOnCloudinary(category.avatar);
    }
    const avatarLocalPath = req.file.path;
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
      throw new ApiError(500, "Error uploading image to Cloudinary");
    }
    category.avatar = avatar.url;
  }
  await category.save();
  return res
    .status(200)
    .json(
      new ApiResponse(200, category, "Category updated successfully", true)
    );
});

const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find();
  return res
    .status(200)
    .json(new ApiResponse(200, categories, "Fetched all categories", true));
});

const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, category, "Fetched category by ID", true));
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  await deleleImageOnCloudinary(category.avatar);
  await Category.findByIdAndDelete(id);
  return res
    .status(204)
    .json(new ApiResponse(204, null, "Category deleted successfully", true));
});

export {
  addCategory,
  updateCategory,
  getAllCategories,
  getCategoryById,
  deleteCategory,
};
