"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_middleware_1 = require("../auth-middleware");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
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
        let user = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [{ privyId: privyId }, { email: email }],
            },
        });
        if (user) {
            // Update existing user (add privyId if missing, update email if needed)
            user = await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    privyId: privyId,
                    email: email,
                },
            });
        }
        else {
            // Create new user (no existing user with this privyId or email)
            user = await prisma_1.prisma.user.create({
                data: {
                    privyId,
                    email,
                },
            });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
        }, process.env.JWT_SECRET);
        res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
            },
        });
    }
    catch (error) {
        console.error("Error syncing Privy user:", error);
        // Handle unique constraint violations
        if (error.code === "P2002") {
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
router.get("/user/:privyId", auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { privyId } = req.params;
        const user = await prisma_1.prisma.user.findUnique({
            where: { privyId },
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
            },
        });
    }
    catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
});
exports.default = router;
