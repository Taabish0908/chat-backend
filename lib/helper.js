import { socketUserIds } from "../app.js";

export const getSockets = (users = []) => {
  const sockets = users.map((user) => socketUserIds.get(user.toString()));

  return sockets;
};

export const getBase64 = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`
