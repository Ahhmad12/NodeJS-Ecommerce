import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary files
    console.log("ERRRO ", error);
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
