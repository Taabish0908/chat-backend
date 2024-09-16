import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";
import { tryCatch } from "./error.js";
import { adminSecretKey } from "../app.js";
import { User } from "../models/user.js";

const authenticateUser = tryCatch(async (req, res, next) => {
  const token = req.cookies["user-token"];

  if (!token) return next(new ErrorHandler("please login first", 401));

  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

  req.user = decodedToken.id;

  next();
});

const adminOnly = tryCatch(async (req, res, next) => {
  const token = req.cookies["admin-token"];
  if (!token)
    return next(new ErrorHandler("only admin can access this route", 401));

  const secretKey = jwt.verify(token, process.env.JWT_SECRET);
  const isMatch = secretKey === adminSecretKey;

  if (!isMatch)
    return next(new ErrorHandler("only admin can access this route", 401));
  // req.user = decodedToken.id

  next();
});

const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(new ErrorHandler(err, 401));
    const authToken = socket.request.cookies["user-token"];
    if (!authToken) return next(new ErrorHandler("please login first", 401));

    const decodedToken = jwt.verify(authToken, process.env.JWT_SECRET);
    const user = await User.findById(decodedToken.id).select("-password");
    if (!user) return next(new ErrorHandler("please login first", 401));
    socket.user = user;
    return next();
  } catch (error) {
    console.log(error);
    return next(
      new ErrorHandler("please login first to access this route", 401)
    );
  }
};

export { authenticateUser, adminOnly, socketAuthenticator };
