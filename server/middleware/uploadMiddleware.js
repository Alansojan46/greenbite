import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const ok = file?.mimetype?.startsWith("image/");
    cb(ok ? null : new Error("Only image uploads are allowed"), ok);
  },
});

