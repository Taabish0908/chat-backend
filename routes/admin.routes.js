import express from "express";
import {
  adminLogin,
  adminLogout,
  allChats,
  getAdminData,
  getAllMessages,
  getAllUsers,
  getDashBoardStats,
} from "../controllers/admin.js";
import { adminLoginValidator, validatorHandler } from "../lib/validator.js";
import { adminOnly } from "../middlewares/auth.js";

const router = express.Router();

router.post("/verify", adminLoginValidator(), validatorHandler, adminLogin);
router.get("/logout", adminLogout);

router.use(adminOnly);
router.get("/", getAdminData);
// only admin can access this route
router.get("/user", getAllUsers);
router.get("/chats", allChats);
router.get("/messages", getAllMessages);
router.get("/stats", getDashBoardStats);
export default router;
