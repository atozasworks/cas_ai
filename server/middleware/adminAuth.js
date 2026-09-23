const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { AppError, asyncHandler } = require('./errorHandler');

const timingEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

const signAdminToken = (username) =>
  jwt.sign(
    { typ: 'admin', username },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

const login = asyncHandler(async (req, res, next) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const expectedUser = config.adminAuth.username;
  const expectedPass = config.adminAuth.password;

  const valid = timingEqual(username, expectedUser) && timingEqual(password, expectedPass);
  if (!valid) {
    return next(new AppError('Invalid admin username or password', 401));
  }

  const token = signAdminToken(expectedUser);
  res.json({
    success: true,
    token,
    adminUser: {
      username: expectedUser,
      name: 'Admin',
      role: 'admin',
    },
  });
});

const protectAdmin = (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return next(new AppError('Not authorized — no admin token provided', 401));
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.typ !== 'admin' || !decoded.username) {
      return next(new AppError('Not authorized — invalid admin session', 401));
    }

    req.admin = { username: decoded.username, role: 'admin' };
    next();
  } catch (err) {
    next(new AppError('Not authorized — admin token invalid', 401));
  }
};

module.exports = { login, protectAdmin };
