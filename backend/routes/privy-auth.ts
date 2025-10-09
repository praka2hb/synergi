import { Router } from "express";
import { PrismaClient } from "../generated/prisma";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../auth-middleware";

const prismaClient = new PrismaClient();
const router = Router();

// Sync Privy user to database (email-only authentication)
router.post("/sync", async (req, res) => {
    try {
        const { privyId, email } = req.body;

        if (!privyId) {
            res.status(400).json({
                message: "Privy ID is required",
                success: false,
            });
            return;
        }

        if (!email) {
            res.status(400).json({
                message: "Email is required",
                success: false,
            });
            return;
        }

        // Check if user exists by privyId OR email
        let user = await prismaClient.user.findFirst({
            where: {
                OR: [
                    { privyId: privyId },
                    { email: email }
                ]
            }
        });

        if (user) {
            // Update existing user (add privyId if missing, update email if needed)
            user = await prismaClient.user.update({
                where: { id: user.id },
                data: {
                    privyId: privyId,
                    email: email,
                }
            });
        } else {
            // Create new user (no existing user with this privyId or email)
            user = await prismaClient.user.create({
                data: {
                    privyId,
                    email,
                }
            });
        }

        // Generate JWT token
        const token = jwt.sign({
            userId: user.id
        }, process.env.JWT_SECRET!);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
            }
        });
    } catch (error: any) {
        console.error("Error syncing Privy user:", error);
        
        // Handle unique constraint violations
        if (error.code === 'P2002') {
            res.status(409).json({
                message: "User with this email or wallet address already exists",
                success: false,
            });
            return;
        }

        res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
});

// Get user by Privy ID
router.get("/user/:privyId", authMiddleware, async (req, res) => {
    try {
        const { privyId } = req.params;

        const user = await prismaClient.user.findUnique({
            where: { privyId }
        });

        if (!user) {
            res.status(404).json({
                message: "User not found",
                success: false,
            });
            return;
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
            }
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
});

export default router;

