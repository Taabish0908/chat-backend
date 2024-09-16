import { compare } from "bcrypt";
import { User } from "../models/user.js";
import {
  emitEvent,
  sendToken,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import { tryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constant/event.js";

const addNewUser = tryCatch(async (req, res, next) => {
  const { name, userName, password, bio } = req.body;
  console.log(name, userName, password, bio);
  const file = req.file;
  if (!file) return next(new ErrorHandler("Please upload avatar", 400));
  const result = await uploadFilesToCloudinary([file]);
  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };
  let user = await User.create({
    name,
    userName,
    password,
    avatar,
    bio,
  });

  sendToken(res, user, 201, "user created successfully");
});

const login = tryCatch(async (req, res, next) => {
  let { userName, password } = req.body;

  let user = await User.findOne({ userName }).select("+password");
  if (!user) return next(new ErrorHandler("invalid credentials"), 404);
  const isMatch = await compare(password, user.password);

  if (!isMatch) return next(new ErrorHandler("invalid credentials"), 404);

  sendToken(res, user, 200, `welcome back ${user.name}`);
});

const getMyProfile = tryCatch(async (req, res) => {
  console.log("req",req.user);
  const user = await User.findById(req.user);
  res.status(200).json({ success: true, user });
});

const logout = tryCatch(async (req, res) => {
  return res
    .status(200)
    .cookie("user-token", "", {
      maxAge: 0,
      sameSite: "none",
      httpOnly: true,
      secure: true,
    })
    .json({ success: true, message: "logged out successfully" });
});

const searchUser = tryCatch(async (req, res) => {
  const { name = "" } = req.query;
  const chats = await Chat.find({ groupChat: false, members: req.user });
  const allMemberFromMyChats = chats.map((chat) => chat.members).flat();
  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allMemberFromMyChats },
    name: { $regex: name, $options: "i" },
  });

  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));
  return res.status(200).json({ success: true, users });
});

const sendRequest = tryCatch(async (req, res, next) => {
  const { userId } = req.body;
  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
    status: "pending",
  });

  if (request) return next(new ErrorHandler("request already sent", 400));

  await Request.create({
    sender: req.user,
    receiver: userId,
  });

  emitEvent(req, NEW_REQUEST, [userId]);
  return res
    .status(200)
    .json({ success: true, message: "request sent successfully" });
});

const acceptRequest = tryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;
  const request = await Request.findById(requestId)
    .populate("receiver", "name ")
    .populate("sender", "name");

  if (!request) return next(new ErrorHandler("request not found", 404));

  if (request.receiver._id.toString() !== req.user.toString())
    return next(
      new ErrorHandler("you are not authorized to perform this action", 401)
    );

  if (!accept) {
    await request.deleteOne();
    return res.status(200).json({ success: true, message: "request rejected" });
  }

  const members = [request.sender._id, request.receiver._id];
  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name} - ${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "request accepted",
    sender: request.sender._id,
  });
});

const getAllNotifications = tryCatch(async (req, res, next) => {
  const request = await Request.find({
    receiver: req.user,
  }).populate("sender", "name avatar");

  const allRequest = request.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));

  return res.status(200).json({ success: true, allRequest });
});

const getMyFriends = tryCatch(async (req, res, next) => {
  const chatId = req.query.chatId;
  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  // Flatten the array using flatMap to get all friends in a single array
  const friends = chats.flatMap(({ members }) => {
    const otherMembers = members.filter(
      (member) => member._id.toString() !== req.user.toString()
    );
    return otherMembers.map((member) => ({
      _id: member._id,
      name: member.name,
      avatar: member.avatar ? member.avatar.url : null, // Safely access avatar.url
    }));
  });

  if (chatId) {
    const chat = await Chat.findById(chatId);
    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );
    return res.status(200).json({ success: true, friends: availableFriends });
  } else {
    return res.status(200).json({ success: true, friends });
  }
});

export {
  addNewUser,
  login,
  getMyProfile,
  logout,
  searchUser,
  sendRequest,
  acceptRequest,
  getAllNotifications,
  getMyFriends,
};
