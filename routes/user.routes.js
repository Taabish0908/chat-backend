import express from "express";
import {
  acceptRequest,
  addNewUser,
  getAllNotifications,
  getMyFriends,
  getMyProfile,
  login,
  logout,
  searchUser,
  sendRequest,
} from "../controllers/user.js";
import { upload } from "../middlewares/multer.js";
import { authenticateUser } from "../middlewares/auth.js";
import {
  acceptRequestValidator,
  registorValidator,
  sendRequestValidator,
  validatorHandler,
} from "../lib/validator.js";
const router = express.Router();

router.post(
  "/register",
  upload.single("avatar"),
  registorValidator(),
  validatorHandler,
  addNewUser
);
router.post("/login", login);

router.get("/user", authenticateUser, getMyProfile);
router.get("/logout", authenticateUser, logout);
router.get("/search", authenticateUser, searchUser);
router.put(
  "/send-request",
  authenticateUser,
  sendRequestValidator(),
  validatorHandler,
  sendRequest
);
router.put(
  "/accept-request",
  authenticateUser,
  acceptRequestValidator(),
  validatorHandler,
  acceptRequest
);

router.get(
  "/all-requests",
  authenticateUser,
  getAllNotifications
)
router.get(
  "/get-my-friends",
  authenticateUser,
  getMyFriends,
)
export default router;
