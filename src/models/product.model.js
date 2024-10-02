import mongoose from "mongoose";
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
    },
    productCategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    productImages: [
      {
        type: String,
        required: true,
      },
    ],
    dimensions: {
      length: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      weight: { type: Number, required: true },
    },
    price: {
      type: Number,
      required: true,
    },
    salePrice: {
      type: Number,
      set: function (value) {
        // If `onSale` is false, set `salePrice` equal to `price`
        return this.onSale ? value : this.price;
      },
    },
    onSale: {
      type: Boolean,
      enum: ["false", "true"],
      required: true,
      default: false,
    },
    stockQuantity: {
      type: Number,
      required: true,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    shippingRequired: {
      type: Boolean,
      enum: ["false", "true"],
      required: true,
      default: true,
    },
    averageRating: {
      type: Number,
    },
    ratingCount: {
      type: Number,
    },
  },
  { timestamps: true }
);

// Virtual field to compute 'in_stock' based on stockQuantity
productSchema.virtual("in_stock").get(function () {
  return this.stockQuantity > 0;
});

// Create the Product model
export const Product = mongoose.model("Product", productSchema);
