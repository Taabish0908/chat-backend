import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { getBase64, getSockets } from "../lib/helper.js";

const connectDb = (uri) => {
  mongoose
    .connect(uri, { useNewUrlParser: true })
    .then((data) =>
      console.log(`MongoDb connected with server: ${data.connection.host}`)
    )
    .catch((err) => {
      throw err;
    });
};

const sendToken = (res, user, code, message) => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET
    //   {
    //   expiresIn: "15d",
    // }
  );
  return res
    .status(code)
    .cookie("user-token", token, {
      maxAge: 15 * 24 * 60 * 60 * 1000,
      sameSite: "none",
      httpOnly: true,
      secure: true,
    })
    .json({
      success: true,
      user,
      message,
    });
};

const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");
  const userSockets = getSockets(users);

  io.to(userSockets).emit(event, data);
};

const uploadFilesToCloudinary = async (files = []) => {
  // const uploadPromises = files.map(async (file) => {
  //   const result = await cloudinary.uploader.upload(file.path, {
  //     resource_type: "auto",
  //   });
  //   return result;
  // });

  const uploadPromise = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });
  });
  try {
    const results = await Promise.all(uploadPromise);
    const formattedResults = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));

    return formattedResults;
  } catch (error) {
    console.log(error);
    throw new Error("Error while uploading files to cloudinary", error);
  }
};
const deleteFilesFromCloudinary = async (publicIds) => {
  // return await Promise.all(
  //   publicIds.map(async (id) => {
  //     await cloudinary.uploader.destroy(id);
  //   })
  // );
};

export {
  connectDb,
  sendToken,
  emitEvent,
  deleteFilesFromCloudinary,
  uploadFilesToCloudinary,
};
