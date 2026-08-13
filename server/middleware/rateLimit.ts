import rateLimit from "express-rate-limit";

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false
});

export const signupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false
});

export const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many payment requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false
});

/** OTP request limiter — protects the email verification code endpoint. */
export const otpRequestRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  message: { error: "Too many verification code requests. Try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false
});

/** OTP verify limiter — protects against brute forcing the 6-digit code. */
export const otpVerifyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: { error: "Too many verification attempts. Please wait and try again." },
  standardHeaders: true,
  legacyHeaders: false
});
