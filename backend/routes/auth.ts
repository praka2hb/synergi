import { Router } from "express";
import { sendEmail } from "../postmark";
import { CreateUser, SignIn } from "../types";
import jwt from "jsonwebtoken";
import { TOTP } from "totp-generator";
import base32 from "hi-base32";
import { authMiddleware } from "../auth-middleware";
import { perMinuteLimiter, perMinuteLimiterRelaxed } from "../ratelimitter";
import { otpEmailHTML } from "../email/otpEmail";
import { prisma } from "../lib/prisma";

const router = Router();

const OTP_PERIOD_SECONDS = 30;

function getOtpSecret(email: string) {
  return base32.encode(
    `${email.toLowerCase().trim()}:${process.env.JWT_SECRET!}`,
  );
}

async function generateOtp(email: string, timestamp = Date.now()) {
  return TOTP.generate(getOtpSecret(email), {
    digits: 6,
    period: OTP_PERIOD_SECONDS,
    timestamp,
  });
}

async function isValidOtp(email: string, providedOtp: string) {
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

router.post("/initiate_signin", perMinuteLimiter, async (req, res) => {
  try {
    const { success, data } = CreateUser.safeParse(req.body);

    if (!success) {
      res.status(411).send("Invalid input");
      return;
    }

    // Generate a stateless 6-digit TOTP using email and secret
    const { otp, expires } = await generateOtp(data.email);

    // Skip email sending in development or when Postmark account is pending
    const isDevelopment =
      process.env.NODE_ENV === "development" ||
      !process.env.POSTMARK_SERVER_TOKEN;

    if (!isDevelopment) {
      try {
        const subject = "Your 1ai sign-in code";
        const text = `Your 6-digit verification code is ${otp}. Valid for ~30 seconds.`;
        const html = otpEmailHTML(otp, data.email, 30);

        await sendEmail({ to: data.email, subject, text, html });
        console.log(`Email sent successfully to ${data.email}`);
      } catch (emailError: any) {
        console.error("Failed to send email:", emailError.message);

        if (
          emailError.response?.status === 422 &&
          emailError.response?.data?.Message?.includes("pending approval")
        ) {
          console.log(
            `⚠️  Postmark account pending approval. OTP for ${data.email}: ${otp}`,
          );
        } else {
          res.status(502).json({
            message: "Failed to send verification email",
            success: false,
          });
          return;
        }
      }
    } else {
      console.log(`🔓 Development mode - OTP for ${data.email}: ${otp}`);
    }

    await prisma.user.upsert({
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
  } catch (e) {
    console.log(e);
    res.json({
      message: "Internal server error",
      success: false,
    });
  }
});

router.post("/signin", perMinuteLimiterRelaxed, async (req, res) => {
  const { success, data } = SignIn.safeParse(req.body);

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

  const user = await prisma.user.findUnique({
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

  const token = jwt.sign(
    {
      userId: user.id,
    },
    process.env.JWT_SECRET!,
  );

  res.status(200).json({
    token,
  });
});

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

router.get("/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
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

export default router;
