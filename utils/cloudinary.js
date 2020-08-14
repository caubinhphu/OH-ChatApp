const cloudinary = require('cloudinary');

// config cloudinary
require('../config/cloudinary').config(cloudinary);

module.exports.upload = (url, publicId, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload(
      url,
      { public_id: publicId, folder },
      function (error, result) {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
};

module.exports.url = (publicId) => cloudinary.url(publicId);
