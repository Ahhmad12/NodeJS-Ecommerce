import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      console.error("No file path provided for Cloudinary upload.");
      return null;
    }
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    if (!response || !response.secure_url) {
      console.error("No secure URL returned from Cloudinary:", response);
      return null;
    }
    return response;
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Error uploading to Cloudinary:", error);
    return null;
  }
};

const deleleImageOnCloudinary = async (oldFilePath) => {
  try {
    if (!oldFilePath) {
      throw new Error("Invalid old file path");
    }
    const publicId = oldFilePath.split("/").pop().split(".")[0];
    if (!publicId) {
      throw new Error("Unable to extract public ID from file path");
    }
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.log("Error when deleting the file from Cloudinary:", error);
  }
};
export { uploadOnCloudinary, deleleImageOnCloudinary };
