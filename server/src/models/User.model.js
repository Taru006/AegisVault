import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      select: false, // never return passwordHash by default
    },
    role: {
      type: String,
      enum: ["Admin", "Manager", "Viewer"],
      default: "Viewer",
    },
    mfaSecret: {
      type: String,
      default: null,
      select: false, // sensitive — never return by default
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    publicKey: {
      type: String,
      default: null, // for future key-exchange / sharing
    },
  },
  { timestamps: true }
);

// ── Hash password before save ───────────────
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// ── Instance method: compare password ───────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model("User", userSchema);
export default User;
