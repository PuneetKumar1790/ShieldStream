import { randomUUID } from "crypto";

import { User } from "../models/User.js";
import { WatchSession } from "../models/WatchSession.js";

let databaseReady = false;

const memoryUsers = new Map();
const memoryWatchSessions = new Map();

export const setDatabaseReady = (ready) => {
  databaseReady = Boolean(ready);
};

export const isDatabaseReady = () => databaseReady;

const toPlain = (doc) => {
  if (!doc) return null;
  return typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
};

const selectFields = (item, fields = []) => {
  if (!item) return null;
  const plain = toPlain(item);
  if (!fields.length) return plain;

  return fields.reduce((acc, field) => {
    if (plain[field] !== undefined) {
      acc[field] = plain[field];
    }
    return acc;
  }, {});
};

const normalizeQueryValue = (value) =>
  typeof value === "string" ? value.toLowerCase() : value;

const matchesUserQuery = (user, query = {}) => {
  if (!user) return false;

  if (query.$or && Array.isArray(query.$or)) {
    return query.$or.some((part) => matchesUserQuery(user, part));
  }

  if (query.email && normalizeQueryValue(user.email) !== normalizeQueryValue(query.email)) {
    return false;
  }

  if (query.username && normalizeQueryValue(user.username) !== normalizeQueryValue(query.username)) {
    return false;
  }

  return true;
};

export const findUserOne = async (query) => {
  if (databaseReady) return User.findOne(query);

  for (const user of memoryUsers.values()) {
    if (matchesUserQuery(user, query)) return user;
  }
  return null;
};

export const findUserById = async (id) => {
  if (databaseReady) return User.findById(id);
  return memoryUsers.get(String(id)) || null;
};

export const createUser = async ({ username, email, password }) => {
  if (databaseReady) {
    return new User({ username, email, password }).save();
  }

  const user = {
    _id: randomUUID(),
    username,
    email,
    password,
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  memoryUsers.set(user._id, user);
  return user;
};

export const saveUser = async (user) => {
  if (!user) return null;

  if (databaseReady) {
    return typeof user.save === "function" ? user.save() : User.findByIdAndUpdate(user._id, user, { new: true });
  }

  const id = String(user._id);
  const current = memoryUsers.get(id) || {};
  const next = {
    ...current,
    ...toPlain(user),
    _id: id,
    updatedAt: new Date(),
  };
  memoryUsers.set(id, next);
  return next;
};

export const getUserFields = (user, fields) => selectFields(user, fields);

const makeSessionKey = (userId, videoId) => `${String(userId)}::${String(videoId)}`;

export const findWatchSession = async ({ userId, videoId }) => {
  if (databaseReady) return WatchSession.findOne({ userId, videoId });
  return memoryWatchSessions.get(makeSessionKey(userId, videoId)) || null;
};

export const createWatchSession = async ({ userId, videoId }) => {
  if (databaseReady) {
    return WatchSession.create({ userId, videoId });
  }

  const session = {
    _id: randomUUID(),
    userId: String(userId),
    videoId: String(videoId),
    startTime: new Date(),
    lastActivity: new Date(),
    isActive: true,
  };

  memoryWatchSessions.set(makeSessionKey(userId, videoId), session);
  return session;
};
