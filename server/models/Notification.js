import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["donation_claimed", "donation_posted", "donation_expired"],
      default: "donation_claimed",
    },
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: "Donation", required: true },
    claimerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "createdAt" } }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
