import { asyncHandler } from "../utilis/asyncHandler.js";
import { ApiError } from "../utilis/apiError.js";
import { Product } from "../models/product.model.js";
import {
  uploadOnCloudinary,
  deleleImageOnCloudinary,
} from "../utilis/cloudinary.js";
import { ApiResponse } from "../utilis/apiResponse.js";
import { Category } from "../models/category.model.js";

const generateResponse = (product, category) => {
  const responseProduct = {
    name: product.name,
    description: product.description,
    shortDescription: product.shortDescription,
    productImages: product.productImages,
    dimensions: product.dimensions,
    price: product.price,
    salePrice: product.salePrice,
    onSale: product.onSale,
    stockQuantity: product.stockQuantity,
    totalSales: product.totalSales,
    shippingRequired: product.shippingRequired,
    averageRating: product.averageRating,
    ratingCount: product.ratingCount,
    _id: product._id,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    productCategory: {
      id: category._id,
      slug: category.slug,
      name: category.name,
      avatar: category.avatar,
    },
  };
  return responseProduct;
};

const addProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    shortDescription,
    price,
    salePrice,
    onSale,
    stockQuantity,
    shippingRequired,
    productCategory: slug,
    dimensions: { length, width, height, weight },
    averageRating = 0,
    ratingCount = 0,
  } = req.body;

  const category = await Category.findOne({ slug });
  if (!category) {
    throw new ApiError(404, "Category not found for the provided slug.");
  }
  const productImages = [];
  if (req.files && req.files.productImage) {
    for (const file of req.files.productImage) {
      const avatarLocalPath = file.path;
      const imageUrl = await uploadOnCloudinary(avatarLocalPath);
      if (!imageUrl) {
        throw new ApiError(
          500,
          `Error uploading image ${file.originalname} to Cloudinary`
        );
      }
      productImages.push(imageUrl.url);
    }
  }

  if (productImages.length !== req.files.productImage.length) {
    throw new ApiError(
      500,
      "Error while uploading images: Some images failed to upload."
    );
  }
  const newProduct = new Product({
    name,
    description,
    shortDescription,
    productImages,
    dimensions: { length, width, height, weight },
    price,
    salePrice,
    onSale,
    productCategory: category._id,
    stockQuantity,
    shippingRequired,
    averageRating,
    ratingCount,
  });
  await newProduct.save();
  const responseProduct = generateResponse(newProduct, category);
  return res
    .status(201)
    .json(
      new ApiResponse(201, responseProduct, "Product added successfully", true)
    );
});

const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({}).populate({
    path: "productCategory",
    select: "slug name avatar",
  });

  const responseProducts = products.map((product) => ({
    name: product.name,
    description: product.description,
    shortDescription: product.shortDescription,
    productImages: product.productImages,
    dimensions: product.dimensions,
    price: product.price,
    salePrice: product.salePrice,
    onSale: product.onSale,
    stockQuantity: product.stockQuantity,
    totalSales: product.totalSales,
    shippingRequired: product.shippingRequired,
    averageRating: product.averageRating,
    ratingCount: product.ratingCount,
    _id: product._id,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    productCategory: product.productCategory
      ? {
          id: product.productCategory._id,
          slug: product.productCategory.slug,
          name: product.productCategory.name,
          avatar: product.productCategory.avatar,
        }
      : null,
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(200, responseProducts, "All products are fetched", true)
    );
});

const updateProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const updateData = req.body;

  if (updateData.productCategory) {
    const category = await Category.findOne({
      slug: updateData.productCategory,
    });
    if (!category) {
      throw new ApiError(404, "Category not found for the provided slug.");
    }
    updateData.productCategory = category._id;
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const productImages = [];
  if (req.files?.productImage) {
    if (product.productImages.length === 3) {
      for (const imageUrl of product.productImages) {
        await deleleImageOnCloudinary(imageUrl);
      }
      product.productImages = [];
    }
    for (const file of req.files.productImage) {
      const imageUrl = await uploadOnCloudinary(file.path);
      if (!imageUrl) {
        throw new ApiError(500, "Error uploading image to Cloudinary");
      }
      productImages.push(imageUrl.url);
    }
    updateData.productImages = productImages;
  }
  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate("productCategory", "slug name avatar");
  const responseProduct = generateResponse(
    updatedProduct,
    updatedProduct.productCategory
  );
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        responseProduct,
        "Product updated successfully",
        true
      )
    );
});

const getProductById = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const category = await Category.findById(product.productCategory);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  const responseProduct = generateResponse(product, category);
  return res
    .status(200)
    .json(new ApiResponse(200, responseProduct, "Fetched product by id", true));
});

const deleteProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const product = await Product.findById(productId);
  if (!product) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Product not found", false));
  }
  if (product.productImages && product.productImages.length > 0) {
    for (const imageUrl of product.productImages) {
      await deleleImageOnCloudinary(imageUrl);
    }
  }
  await Product.findByIdAndDelete(productId);
  res
    .status(200)
    .json(new ApiResponse(200, null, "Product deleted successfully", true));
});

export {
  addProduct,
  getAllProducts,
  updateProduct,
  getProductById,
  deleteProduct,
};
