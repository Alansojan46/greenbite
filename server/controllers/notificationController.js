import Notification from "../models/Notification.js";

export const getMyNotifications = async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("donationId", "foodName status")
      .populate("claimerId", "name email");
    res.json(list);
  } catch (err) {
    console.error("Get notifications error", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

export const markRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id },
      { $set: { read: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Mark read error", err);
    res.status(500).json({ message: "Failed to update" });
  }
};
