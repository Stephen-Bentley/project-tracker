import multer from 'multer';

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const imageFileFilter: multer.Options['fileFilter'] = (
  _req,
  file,
  callback
) => {
  if (!allowedImageTypes.has(file.mimetype)) {
    callback(new Error('Only JPG, PNG, WebP, and GIF images are allowed.'));
    return;
  }
  callback(null, true);
};

const imageUploadOptions = {
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
};

export const avatarUpload = multer({
  ...imageUploadOptions,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const taskImageUpload = multer({
  ...imageUploadOptions,
  limits: { fileSize: 3 * 1024 * 1024 },
});
