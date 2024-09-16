import express from "express";
const app = express();
import { connectDb } from "./utils/features.js";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuid } from "uuid";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import {
  CHAT_JOINED,
  CHAT_LEFT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
} from "./constant/event.js";

import { getSockets } from "./lib/helper.js";
import { Message } from "./models/message.js";
import { corsOption } from "./constant/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";

import userRoutes from "./routes/user.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import adminRoutes from "./routes/admin.routes.js";

dotenv.config({
  path: "./.env",
});
const uri = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
export const adminSecretKey = process.env.ADMIN_SECRET_KEY || "admin-Taabish";
const socketUserIds = new Map();
const onlineUsers = new Set();

connectDb(uri);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// createUser(10)
// createGroupsChats(20);
// createSingleChats(10)
// createMessageInChat("66dae93e94d812af1c9689f3",10)


app.use(cors(corsOption));
const server = createServer(app);
const io = new Server(server, {
  cors:corsOption
});

app.set("io", io);
app.use(express.json());

app.use(cookieParser());

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("default route");
});

io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err, socket, next)
  );
});

io.on("connection", (socket) => {
  const user = socket.user;
  socketUserIds.set(user._id?.toString(), socket.id);
  // console.log("a user connected", socket.id);
  // console.log(socketUserIds);
  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    // console.log(data, typeof data);
    // const parsedData = JSON.parse(data);
    // const { chatId, members, message } = parsedData;
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };
    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };
    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });
    await Message.create(messageForDB);
    console.log(messageForRealTime);
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    console.log("start - typing", chatId);

    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    console.log("stop - typing", chatId);

    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(STOP_TYPING, { chatId });
  });

  socket.on(CHAT_JOINED, ({ userId, members }) => {
    console.log("chat joined", userId);
    onlineUsers.add(userId?.toString());
    const membersSockets = getSockets(members);
    io.to(membersSockets).emit(ONLINE_USERS, Array.from(onlineUsers));
  });
  socket.on(CHAT_LEFT, ({ userId, members }) => {
    console.log("chat left", userId);
    onlineUsers.delete(userId?.toString());
    const membersSockets = getSockets(members);
    io.to(membersSockets).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    socketUserIds.delete(user?.id?.toString());
    onlineUsers.delete(user?.id?.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});

app.use(errorMiddleware);
server.listen(port, () => {
  console.log(`server is running on port ${port} in ${envMode} Mode`);
});

export { socketUserIds, envMode };
