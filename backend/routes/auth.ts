import { Router } from "express";
import { sendEmail } from "../postmark";
import { CreateUser, SignIn } from "../types";
import jwt from "jsonwebtoken";
import { TOTP } from "totp-generator"
import base32 from "hi-base32";
import { PrismaClient } from "../generated/prisma";
import { authMiddleware } from "../auth-middleware";
// import { perMinuteLimiter, perMinuteLimiterRelaxed } from "../ratelimitter";
import { otpEmailHTML } from "../email/otpEmail";

const prismaClient = new PrismaClient();

const router = Router();

// Temporarily adding local user otp cache
const otpCache = new Map<string, string>();

// TODO: Rate limit this
router.post("/initiate_signin", async (req, res) => {
    try {
        const { success, data } = CreateUser.safeParse(req.body);

        if (!success) {
            res.status(411).send("Invalid input");
            return
        }

        // Generate 6-digit TOTP using email and secret
        console.log("before send email")
        const { otp, expires } = TOTP.generate(base32.encode(data.email + process.env.JWT_SECRET!), { digits: 6 });
        console.log("email is", data.email);
        console.log("otp is", otp);

        // Skip email sending in development or when Postmark account is pending
        const isDevelopment = process.env.NODE_ENV === "development" || !process.env.POSTMARK_SERVER_TOKEN;
        
        if (!isDevelopment) {
            try {
                const subject = "Your 1ai sign-in code";
                const text = `Your 6-digit verification code is ${otp}. Valid for ~30 seconds.`;
                const html = otpEmailHTML(otp, data.email, 30);

                await sendEmail({ to: data.email, subject, text, html });
                console.log(`Email sent successfully to ${data.email}`);
            } catch (emailError: any) {
                console.error("Failed to send email:", emailError.message);
                
                // If Postmark account is pending, log the OTP for development
                if (emailError.response?.status === 422 && 
                    emailError.response?.data?.Message?.includes("pending approval")) {
                    console.log(`⚠️  Postmark account pending approval. OTP for ${data.email}: ${otp}`);
                } else {
                    // For other email errors, still allow login but log the issue
                    console.log(`⚠️  Email delivery failed. OTP for ${data.email}: ${otp}`);
                }
            }
        } else {
            console.log(`🔓 Development mode - OTP for ${data.email}: ${otp}`);
        }

        otpCache.set(data.email, otp);
        try {
            await prismaClient.user.create({
                data: {
                    email: data.email,
                }
            });
        } catch (e) {
            console.log("User already exists");
        }

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
})

router.post("/signin", async (req, res) => {
    const { success, data } = SignIn.safeParse(req.body);

    if (!success) {
        res.status(411).send("Invalid input");
        return;
    }

    console.log("data is");
    console.log(data);
    console.log("otpCache is", otpCache.get(data.email));

    if (otpCache.get(data.email) != data.otp) {
        console.log("invalid otp");
        res.status(401).json({
            message: "Invalid otp"
        })
        return
    }

    const user = await prismaClient.user.findUnique({
        where: {
            email: data.email
        }
    });

    if (!user) {
        res.json({
            message: "User not found",
            success: false,
        })
        return
    }

    const token = jwt.sign({
        userId: user.id
    }, process.env.JWT_SECRET!);

    res.status(200).json({
        token
    })
})

router.get("/me", authMiddleware, async (req, res) => {
    const user = await prismaClient.user.findUnique({
        where: { id: req.userId }
    })

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
        }
    })
})

export default router;