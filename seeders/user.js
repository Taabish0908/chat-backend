import { faker, simpleFaker } from "@faker-js/faker";
import { User } from "../models/user.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { tryCatch } from "../middlewares/error.js";

const createUser = async (numUsers) => {
  try {
    const userPromise = [];

    for (let i = 0; i < numUsers; i++) {
      const tempUser = User.create({
        name: faker.person.fullName(),
        userName: faker.internet.userName(),
        bio: faker.lorem.sentence(10),
        password: "123456",
        avatar: {
          url: faker.image.avatar(),
          public_id: faker.system.fileName(),
        },
      });

      userPromise.push(tempUser);
    }

    await Promise.all(userPromise);
    console.log("users created", numUsers);
    process.exit(1);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

const createSingleChats = async (numChats) => {
  try {
    const users = await User.find().select("_id");
    const ChatPromise = [];
    for (let i = 0; i < users.length; i++) {
      for (let j = 0; j < users.length; j++) {
        ChatPromise.push(
          Chat.create({
            name: faker.lorem.words(2),
            members: [users[i], users[j]],
          })
        );
      }
    }

    await Promise.all(ChatPromise);
    console.log("chats created");
    process.exit(1);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

const createGroupsChats = async (numChats) => {
  try {
    const users = await User.find().select("_id");
    const ChatPromise = [];
    for (let i = 0; i < numChats; i++) {
      const numMebers = simpleFaker.number.int({ min: 3, max: users.length });
      const members = [];

      for (let i = 0; i < numMebers; i++) {
        const randomIndex = Math.floor(Math.random() * users.length);
        const randomUser = users[randomIndex];
        if (!members.includes(randomUser)) {
          members.push(randomUser);
        }
      }

      const chat = Chat.create({
        name: faker.lorem.words(1),
        groupChat: true,
        members,
        creator: members[0],
      });
      ChatPromise.push(chat);
    }

    await Promise.all(ChatPromise);
    console.log("chats created");
    process.exit(1);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

const createMessages = async (numMessage) => {
  try {
    const users = await User.find().select("_id");
    const chats = await Chat.find().select("_id");

    const messagePromise = [];

    for (let i = 0; i < numMessage; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomChat = chats[Math.floor(Math.random() * chats.length)];
      messagePromise.push(
        Message.create({
          chat: randomChat,
          sender: randomUser,
          content: faker.lorem.sentence(),
        })
      );
    }

    await Promise.all(messagePromise);
    console.log("Message created");
    process.exit(1);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

const createMessageInChat = async (chatId, numMesasge) => {
  try {
    const users = await User.find().select("_id");
    const messagePromise = [];
    for (let i = 0; i < numMesasge; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      messagePromise.push(
        Message.create({
          chat: chatId,
          sender: randomUser,
          content: faker.lorem.sentence(),
        })
      );
    }

    await Promise.all(messagePromise);

    console.log("Message created");
    process.exit(1);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export {
  createUser,
  createSingleChats,
  createGroupsChats,
  createMessages,
  createMessageInChat,
};
