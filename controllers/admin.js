import { tryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";

const adminLogin = tryCatch(async (req, res, next) => {
  const { secretKey } = req.body;
  const adminSecretKey = process.env.ADMIN_SECRET_KEY || "admin-Taabish";
  const isMatch = secretKey === adminSecretKey;
  if (!isMatch) return next(new ErrorHandler("invalid credentials"), 401);

  const token = jwt.sign(secretKey, process.env.JWT_SECRET);
  return res
    .status(200)
    .cookie("admin-token", token, {
      maxAge: 1000 * 60 * 15,
      // maxAge: 15 * 24 * 60 * 60 * 1000,
      sameSite: "none",
      httpOnly: true,
      secure: true,
    })
    .json({
      success: true,
      message: "login verified... Welcome Admistrator",
    });
});

const adminLogout = tryCatch(async (req, res) => {
  return res
    .status(200)
    .cookie("admin-token", "", {
      maxAge: 0,
      sameSite: "none",
      httpOnly: true,
      secure: true,
    })
    .json({ success: true, message: "logged out successfully" });
});

const getAdminData = tryCatch(async (req, res) => {
  res.status(200).json({ admin: true });
});

const getAllUsers = tryCatch(async (req, res, next) => {
  const users = await User.find();
  const transformedUsers = await Promise.all(
    users.map(async ({ name, userName, avatar, _id }) => {
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({ groupChat: true, members: _id }),
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);

      return {
        name,
        userName,
        avatar: avatar.url,
        _id,
        groups,
        friends,
      };
    })
  );
  return res.status(200).json({ success: true, users:transformedUsers });
});

const allChats = tryCatch(async (req, res, next) => {
  const chats = await Chat.find()
    .populate("members", "name avatar")
    .populate("creator", "name avatar");

  const transformedChat = await Promise.all(
    chats.map(async ({ name, groupChat, members, _id, creator }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });
      return {
        _id,
        name,
        groupChat,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        members: members.map(({ _id, name, avatar }) => ({
          _id,
          name,
          avatar: avatar.url,
        })),
        creator: {
          name: creator?.name || "",
          avatar: creator?.avatar?.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    })
  );
  return res.status(200).json({ success: true, chats: transformedChat });
});

const getAllMessages = tryCatch(async (req, res, next) => {
  const messages = await Message.find()
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

  const transformedMesage = messages.map(
    ({ _id, sender, content, attachments, createdAt, chat }) => ({
      _id,
      attachments,
      content,
      createdAt,
      chat: chat._id,
      groupChat: chat.groupChat,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    })
  );
  return res.status(200).json({
    success: true,
    messages: transformedMesage,
  });
});

const getDashBoardStats = tryCatch(async (req, res, next) => {
  const [groupCount, userCount, messageCount, totalChatsCount] =
    await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments(),
      Message.countDocuments(),
      Chat.countDocuments(),
    ]);

  const today = new Date();
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  const last7DaysMesages = await Message.find({
    createdAt: {
      $gte: last7Days,
      $lte: today,
    },
  }).select("createdAt");
  console.log(last7DaysMesages);
  const messages = new Array(7).fill(0);
  const dayInMiliseconds = 1000 * 60 * 60 * 24;
  last7DaysMesages.forEach((message) => {
    const indexApprox =
      (today.getTime() - message.createdAt.getTime()) / dayInMiliseconds;
    const index = Math.floor(indexApprox);
    messages[6 - index]++;
  });
  const stats = {
    groupCount,
    userCount,
    messageCount,
    totalChatsCount,
    messageChats: messages,
  };

  return res.status(200).json({
    success: true,
    stats,
  });
});

export {
  getAllUsers,
  allChats,
  getAllMessages,
  getDashBoardStats,
  adminLogin,
  adminLogout,
  getAdminData,
};
