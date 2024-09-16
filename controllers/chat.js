import {
  ALERT,
  NEW_ATTACHMENT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constant/event.js";
import { tryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { User } from "../models/user.js";
import {
  deleteFilesFromCloudinary,
  emitEvent,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";
import { Message } from "../models/message.js";

const newGroupChat = tryCatch(async (req, res, next) => {
  const { name, members } = req.body;
  if (members.length < 2) {
    return next(new ErrorHandler("at least two members are required", 400));
  }

  const allMembers = [...members, req.user];

  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
  emitEvent(req, REFETCH_CHATS, members);

  return res
    .status(201)
    .json({ success: true, message: "Group Created Successfully" });
});

const myChats = tryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name avatar"
  );

  const transformedChat = chats.map(({ _id, name, members, groupChat }) => {
    let otherMembers = members.filter(
      ({ _id }) => _id.toString() !== req.user.toString()
    );
    return {
      _id,
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMembers[0].avatar.url],
      // : otherMembers.map(({ avatar }) => avatar.url),
      name: groupChat ? name : otherMembers[0].name,
      // name:groupChat ? name : otherMembers.map(({ name }) => name).join(", "),
      members: members.reduce((prev, curr) => {
        if (curr._id.toString() !== req.user.toString()) {
          prev.push(curr._id);
        }
        return prev;
      }, []),
    };
  });
  return res.status(200).json({
    success: true,
    message: "chat fetched successfully",
    chats: transformedChat,
  });
});

const getMyGroups = tryCatch(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user,
    groupChat: true,
    creator: req.user,
  }).populate("members", "name avatar");

  const groups = chats.map(({ members, _id, groupChat, name }) => {
    return {
      _id,
      groupChat,
      name,
      avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
    };
  });
  return res.status(200).json({
    success: true,
    groups,
  });
});

const addMembers = tryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;
  if (!members || members.length < 1)
    return next(new ErrorHandler("Please provide members", 400));

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("this is not a group chat", 404));

  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("only group creator can add members", 403));

  const allNewMembersPromise = members?.map((i) => User.findById(i, "name"));
  const allNewMembers = await Promise.all(allNewMembersPromise);

  const uniqueNewMembers = allNewMembers.filter(
    (newMember) => !chat.members.includes(newMember._id)
  );

  chat.members.push(...uniqueNewMembers?.map(({ _id }) => _id));

  if (chat.members.length > 100) {
    return next(new ErrorHandler("members limit reached", 404));
  }

  await chat.save();

  const allUserName = uniqueNewMembers?.map((i) => i.name).join(", ");

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUserName} added successfully in the group`
  );

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: `Members added successfully`,
  });
});

const removeMembers = tryCatch(async (req, res, next) => {
  const { chatId, userId } = req.body;

  const [chat, userNeedsToBeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);
  if (!chat) return next(new ErrorHandler("chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("this is not a group chat", 404));

  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("only group creator can add members", 403));

  if (chat.members.length <= 3)
    return next(new ErrorHandler("group must have at least 3 members", 400));

  const allChatMembers = chat.members.map((i) => i.toString());
  // chat.members = allNewMembers;

  chat.members = chat?.members.filter(
    (member) => member.toString() !== userId.toString()
  );
  await chat.save();

  emitEvent(req, ALERT, chat.members, {
    message: `${userNeedsToBeRemoved.name} removed from the group`,
    chatId,
  });
  emitEvent(req, REFETCH_CHATS, allChatMembers);
  return res.status(200).json({
    success: true,
    message: `Member removed successfully`,
  });
});

const leaveGroup = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("chat not found", 404));

  if (!chat.groupChat)
    return next(new ErrorHandler("this is not a group chat", 404));

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );

  if (chat.creator.toString() === req.user.toString()) {
    const randomUser = Math.floor(Math.random() * remainingMembers.length);

    const newCreator = remainingMembers[randomUser];
    chat.creator = newCreator;
  }

  chat.members = remainingMembers;
  const [user] = await Promise.all([
    User.findById(req.user, "name"),
    chat.save(),
  ]);

  emitEvent(req, ALERT, chat.members, {
    chatId,
    message: `User ${user.name} left the group`,
  });

  //   emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: `User ${user.name} left the group`,
  });
});

const sendAttachment = tryCatch(async (req, res, next) => {
  const { chatId } = req.body;

  const files = req.files || [];
  const [chat, user] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, "name"),
  ]);
  console.log(chat, user);
  if (!chat) return next(new ErrorHandler("chat not found", 404));

  if (files.length < 1)
    return next(new ErrorHandler("Please provide attachment", 400));
  if (files.length > 5)
    return next(new ErrorHandler("Max 5 files allowed", 400));

  const attachments = await uploadFilesToCloudinary(files);

  const messageForDB = {
    content: "",
    attachments,
    sender: user._id,
    chat: chatId,
  };

  const messageForRealTime = {
    ...messageForDB,
    sender: { _id: user._id, name: user.name },
  };

  const message = await Message.create(messageForDB);

  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealTime,
    chatId,
  });
  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  return res.status(200).json({
    success: true,
    message,
  });
});

const getChatDetails = tryCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean();
    if (!chat) return next(new ErrorHandler("chat not found", 404));

    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));
    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return next(new ErrorHandler("chat not found", 404));
    return res.status(200).json({
      success: true,
      chat,
    });
  }
});

const renameChat = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("this is not a group chat", 404));
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("you are not allowed to rename", 403));

  chat.name = name;
  await chat.save();
  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "chat renamed successfully",
  });
});

const deleteChat = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("chat not found", 404));

  const members = chat.members;
  if (chat.groupChat && chat.creator.toString() !== req.user.toString())
    return next(
      new ErrorHandler("you are not allowed to delete the group", 403)
    );

  if (!chat.groupChat && !chat.members.includes(req.user.toString()))
    return next(
      new ErrorHandler("you are not allowed to delete the chat", 403)
    );

  // here we have to delete all mesasges as well as the attachment/files form cloudinary

  const messageWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];
  messageWithAttachments.forEach(({ attachments }) => {
    attachments.forEach(({ public_id }) => {
      public_ids.push(public_id);
    });
  });

  await Promise.all([
    // delete files from cloudinary
    deleteFilesFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, members);
  return res.status(200).json({
    success: true,
    message: "chat deleted successfully",
  });
});

const getMessages = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;
  const limit = 20;
  const skip = (page - 1) * limit;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("chat not found", 404));
  if (!chat.members.includes(req.user.toString()))
    return next(
      new ErrorHandler("you are not allowed to access this chat", 403)
    );

  const [messages, totalMessageCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name ")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);

  const totalPage = Math.ceil(totalMessageCount / limit);
  return res.status(200).json({
    success: true,
    messages: messages.reverse(),
    totalMessageCount,
    totalPage,
  });
});

export {
  newGroupChat,
  myChats,
  getMyGroups,
  addMembers,
  removeMembers,
  leaveGroup,
  sendAttachment,
  getChatDetails,
  renameChat,
  deleteChat,
  getMessages,
};
