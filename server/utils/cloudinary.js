import { v2 as cloudinary } from "cloudinary";

const { CLOUDINARY_KEY, CLOUDINARY_SECRET, CLOUDINARY_CLOUD_NAME } = process.env;

if (!CLOUDINARY_KEY || !CLOUDINARY_SECRET || !CLOUDINARY_CLOUD_NAME) {
  console.warn("Cloudinary environment variables are not fully configured.");
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_KEY,
  api_secret: CLOUDINARY_SECRET,
});

export default cloudinary;

