import express from "express";

import { authenticateUser } from "../middlewares/auth.js";
import {
  addMembers,
  deleteChat,
  getChatDetails,
  getMessages,
  getMyGroups,
  leaveGroup,
  myChats,
  newGroupChat,
  removeMembers,
  renameChat,
  sendAttachment,
} from "../controllers/chat.js";
import { upload } from "../middlewares/multer.js";
const router = express.Router();
router.use(authenticateUser);

router.post("/new-group-chat", newGroupChat);
router.get("/get-my-chat", myChats);
router.get("/get-my-groups", getMyGroups);
router.put("/add-members", addMembers);
router.put("/remove-member", removeMembers);
router.delete("/leave/:id", leaveGroup);
router.post("/message", upload.array("files", 5), sendAttachment);

router.get("/message/:id", getMessages);
//route chaining
router.route("/:id").get(getChatDetails).put(renameChat).delete(deleteChat);

export default router;
