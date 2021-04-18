const cloudinary = require('cloudinary');

// config cloudinary
require('../config/cloudinary').config(cloudinary);

module.exports.upload = (url, publicId, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload(
      url,
      {
        public_id: publicId,
        folder,
        resource_type: 'auto',
      },
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

module.exports.deleteResources = (publicIds) => {
  return Promise.all(
    [
      this.deleteTypeResources(publicIds.resRaws, 'raw'),
      this.deleteTypeResources(publicIds.resImages, 'image'),
      this.deleteTypeResources(publicIds.resVideos, 'video')
    ]
  )
};

module.exports.deleteTypeResources = (publicIds, type) => {
  if (!publicIds.length) {
    return null
  }
  return new Promise((resolve, reject) => {
    cloudinary.v2.api.delete_resources(
      publicIds,
      { resource_type: type },
      (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    })
  });
};


module.exports.url = (publicId) => cloudinary.url(publicId);
