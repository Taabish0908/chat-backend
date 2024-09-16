import { body, validationResult, check } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const validatorHandler = (req, res, next) => {
  const errors = validationResult(req);
  const errorMessage = errors
    .array()
    .map((err) => err.msg)
    .join(", ");
  console.log(errorMessage);
  if (errors.isEmpty()) return next();
  else next(new ErrorHandler(errorMessage, 400));
};

const registorValidator = () => [
  body("name", "name is required").notEmpty(),
  body("userName", "username is required").notEmpty(),
  body("password", "password is required").notEmpty(),
  
];

const sendRequestValidator = () => [
  body("userId", "userId is required").notEmpty(),
];
const acceptRequestValidator = () => [
  body("requestId", "requestId is required").notEmpty(),
  body("accept", "accept is required")
    .isBoolean()
    .withMessage("accept must be boolean"),
];

const adminLoginValidator = () => [
  body("secretKey", "please provide secretKey").notEmpty(),
];

export {
  registorValidator,
  validatorHandler,
  sendRequestValidator,
  acceptRequestValidator,
  adminLoginValidator
};
