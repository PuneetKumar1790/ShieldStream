import mongoose from "mongoose";

const watchSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  videoId: {
    type: String,
    required: true,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

// Create compound index for efficient queries
watchSessionSchema.index({ userId: 1, videoId: 1 }, { unique: true });

const WatchSession = mongoose.model("WatchSession", watchSessionSchema);

export { WatchSession };
