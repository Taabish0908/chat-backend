import bcrypt from "bcrypt";
import mongoose, { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    userName: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    avatar: {
      public_id: { type: String, required: true },
      url: { type: String, required: true },
    },
    bio: { type: String },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export const User = mongoose.models.User || model("User", userSchema);
