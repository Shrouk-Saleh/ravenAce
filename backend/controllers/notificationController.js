// controllers/notificationController.js
const Notification = require("../models/Notification");
const { AppError } = require("../utils/errorUtils");
const { emitToUser, emitNewExamNotification } = require("../utils/socket");

// ────────────────────────────────────────────────────────────────
// Internal helper — called by other controllers (not a route).
// Creates a notification for one user AND pushes it instantly over
// Socket.io if that user currently has the app open.
// ────────────────────────────────────────────────────────────────
const createNotification = async (userId, type, message, refId = null) => {
  const notification = await Notification.create({ user: userId, type, message, refId });

  // Real-time push — does nothing if the user has no open socket
  emitToUser(userId, "notification:new", {
    _id: notification._id,
    type: notification.type,
    message: notification.message,
    read: notification.read,
    refId: notification.refId,
    createdAt: notification.createdAt,
  });

  return notification;
};

// ────────────────────────────────────────────────────────────────
// Internal helper — notify students (e.g. new exam published)
// Pushes one Socket.io event to everyone connected, in addition to
// writing a Notification document per student for the bell/inbox.
// ────────────────────────────────────────────────────────────────
const notifyAllStudents = async (type, message, refId = null, orgId = null) => {
  const User = require("../models/User");
  
  const query = { role: "student", isActive: true };
  if (orgId) {
    query.organization = orgId;
  }
  
  const students = await User.find(query).select("_id");
  const docs = students.map(s => ({
    user: s._id, type, message, refId,
  }));
  if (docs.length > 0) {
    await Notification.insertMany(docs);
  }

  // Emit to the specific org room (or 'public' room for no-org students).
  // This correctly scopes real-time notifications to within the organization.
  emitNewExamNotification("notification:new-exam", { type, message, refId }, orgId);
};


// ────────────────────────────────────────────────────────────────
// @desc    Get all notifications for logged-in user
// @route   GET /api/notifications
// @access  Any logged-in user
// ────────────────────────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const filter = { user: req.user._id };

    // ?unread=true — only unread
    if (req.query.unread === "true") filter.read = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });

    res.status(200).json({
      status: "success",
      unreadCount,
      results: notifications.length,
      data: { notifications },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Mark one notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Any logged-in user
// ────────────────────────────────────────────────────────────────
const markOneRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notif) return next(new AppError("Notification not found.", 404));

    res.status(200).json({ status: "success", data: { notification: notif } });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Mark ALL notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Any logged-in user
// ────────────────────────────────────────────────────────────────
const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );
    res.status(200).json({ status: "success", message: "All notifications marked as read." });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Delete one notification
// @route   DELETE /api/notifications/:id
// @access  Any logged-in user
// ────────────────────────────────────────────────────────────────
const deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.status(200).json({ status: "success", message: "Notification deleted." });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createNotification,
  notifyAllStudents,
  getNotifications,
  markOneRead,
  markAllRead,
  deleteNotification,
};
