"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const postmark_1 = require("../postmark");
const types_1 = require("../types");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const totp_generator_1 = require("totp-generator");
const hi_base32_1 = __importDefault(require("hi-base32"));
const auth_middleware_1 = require("../auth-middleware");
const ratelimitter_1 = require("../ratelimitter");
const otpEmail_1 = require("../email/otpEmail");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
const OTP_PERIOD_SECONDS = 30;
function getOtpSecret(email) {
    return hi_base32_1.default.encode(`${email.toLowerCase().trim()}:${process.env.JWT_SECRET}`);
}
async function generateOtp(email, timestamp = Date.now()) {
    return totp_generator_1.TOTP.generate(getOtpSecret(email), {
        digits: 6,
        period: OTP_PERIOD_SECONDS,
        timestamp,
    });
}
async function isValidOtp(email, providedOtp) {
    const normalizedOtp = String(providedOtp).trim();
    const now = Date.now();
    const windows = [0, -OTP_PERIOD_SECONDS * 1000, OTP_PERIOD_SECONDS * 1000];
    for (const offset of windows) {
        const { otp } = await generateOtp(email, now + offset);
        if (otp === normalizedOtp) {
            return true;
        }
    }
    return false;
}
router.post("/initiate_signin", ratelimitter_1.perMinuteLimiter, async (req, res) => {
    try {
        const { success, data } = types_1.CreateUser.safeParse(req.body);
        if (!success) {
            res.status(411).send("Invalid input");
            return;
        }
        // Generate a stateless 6-digit TOTP using email and secret
        const { otp, expires } = await generateOtp(data.email);
        // Skip email sending in development or when Postmark account is pending
        const isDevelopment = process.env.NODE_ENV === "development" ||
            !process.env.POSTMARK_SERVER_TOKEN;
        if (!isDevelopment) {
            try {
                const subject = "Your 1ai sign-in code";
                const text = `Your 6-digit verification code is ${otp}. Valid for ~30 seconds.`;
                const html = (0, otpEmail_1.otpEmailHTML)(otp, data.email, 30);
                await (0, postmark_1.sendEmail)({ to: data.email, subject, text, html });
                console.log(`Email sent successfully to ${data.email}`);
            }
            catch (emailError) {
                console.error("Failed to send email:", emailError.message);
                if (emailError.response?.status === 422 &&
                    emailError.response?.data?.Message?.includes("pending approval")) {
                    console.log(`⚠️  Postmark account pending approval. OTP for ${data.email}: ${otp}`);
                }
                else {
                    res.status(502).json({
                        message: "Failed to send verification email",
                        success: false,
                    });
                    return;
                }
            }
        }
        else {
            console.log(`🔓 Development mode - OTP for ${data.email}: ${otp}`);
        }
        await prisma_1.prisma.user.upsert({
            where: {
                email: data.email,
            },
            update: {},
            create: {
                email: data.email,
            },
        });
        res.json({
            message: "Check your email",
            success: true,
        });
    }
    catch (e) {
        console.log(e);
        res.json({
            message: "Internal server error",
            success: false,
        });
    }
});
router.post("/signin", ratelimitter_1.perMinuteLimiterRelaxed, async (req, res) => {
    const { success, data } = types_1.SignIn.safeParse(req.body);
    if (!success) {
        res.status(411).send("Invalid input");
        return;
    }
    const otp = String(data.otp).trim();
    const otpIsValid = await isValidOtp(data.email, otp);
    if (!otpIsValid) {
        console.log("invalid otp");
        res.status(401).json({
            message: "Invalid or expired otp",
        });
        return;
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: {
            email: data.email,
        },
    });
    if (!user) {
        res.json({
            message: "User not found",
            success: false,
        });
        return;
    }
    const token = jsonwebtoken_1.default.sign({
        userId: user.id,
    }, process.env.JWT_SECRET);
    res.status(200).json({
        token,
    });
});
router.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});
router.get("/me", auth_middleware_1.authMiddleware, async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.userId },
    });
    if (!user) {
        res.status(401).send({
            message: "Unauthorized",
            success: false,
        });
        return;
    }
    res.json({
        user: {
            id: user?.id,
            email: user?.email,
        },
    });
});
exports.default = router;
