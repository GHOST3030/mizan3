import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: 'محاولات تسجيل دخول كثيرة جداً. حاول بعد دقيقة' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: 'طلبات كثيرة جداً. حاول بعد دقيقة' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: 'طلبات كثيرة جداً. حاول بعد دقيقة' },
  standardHeaders: true,
  legacyHeaders: false,
});
