import { Hono } from "hono";
import { EnvObject } from "../contracts/app.model";
import { z } from "zod";
import { Prisma, PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import bcrypt from 'bcryptjs';
import { env } from "hono/adapter";
import jwt from "jsonwebtoken";

const userRouter = new Hono<{ Bindings: EnvObject }>()

// Zod schema for user signup request body
const UserSignupSchema = z.object({
    username: z.string().min(5, "Username is required with minimum 5 characters"),
    email: z.string().email(),
    password: z.string({ required_error: "Password is required" })
        .min(8, "Password must be at least 8 characters long")
        .refine((val) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{1,}$/.test(val ?? ""), "Password should contain at least 1 UPPERCASE, 1 lowercase and 1 number"),
    firstName: z.string().min(1, "First Name is a required field"),
    lastName: z.string().min(1, "Last Name is a required field")
})

const UserSigninSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required")
})

userRouter.post('/signup', async (c) => {
    const parsedDataPayload = UserSignupSchema.safeParse(await c.req.json());
    if (!parsedDataPayload.success || parsedDataPayload.error) {
        const firstError = parsedDataPayload.error?.errors.at(0);
        return c.json({
            path: firstError?.path[0],
            message: firstError?.message
        }, 411);
    }

    const DATABASE_URL = c.env.DATABASE_URL;

    const prisma = new PrismaClient({
        datasourceUrl: DATABASE_URL
    }).$extends(withAccelerate())

    const hashedPassword = await bcrypt.hash(parsedDataPayload.data.password, 10);

    return prisma.user.create({
        data: {
            username: parsedDataPayload.data.username,
            email: parsedDataPayload.data.email,
            authToken: hashedPassword,
            firstName: parsedDataPayload.data.firstName,
            lastName: parsedDataPayload.data.lastName
        },
        select: {
            email: true,
            firstName: true,
            lastName: true
        }
    })
        .then(() => {
            return c.json({ message: "User created Succesfully" })
        })
        .catch((err: any) => {
            if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code === 'P2002'
            ) {
                // Check if the unique constraint failure is on the `username` field
                const failedField = err.meta?.target as string[];

                if (failedField && failedField.includes('username')) {
                    return c.json({ error: 'Username already taken' }, 411);
                }
                else if (failedField && failedField.includes('email')) {
                    return c.json({ error: 'Email already taken' }, 411);
                }
                return c.json({ error: 'Unique constraint failed' }, 411);
            }

            // Other errors
            return c.json({ message: 'An unexpected error occurred', details: err.message }, 500);
        });

});

userRouter.post('/signin', async (c) => {
    const parsedDataPayload = UserSigninSchema.safeParse(await c.req.json());
    if (!parsedDataPayload.success || parsedDataPayload.error) {
        const firstError = parsedDataPayload.error?.errors.at(0);
        return c.json({
            path: firstError?.path,
            message: firstError?.message
        }, 411);
    }
    const { DATABASE_URL, JWT_SECRET } = env<{ DATABASE_URL: string; JWT_SECRET: string }>(c);
    const prisma = new PrismaClient({
        datasourceUrl: DATABASE_URL
    }).$extends(withAccelerate());

    const retrievedUser = await prisma.user.findFirst({
        where: {
            username: parsedDataPayload.data.username,
        }
    })
    
    if (!retrievedUser) {
        return c.json({
            message: "Invalid username / password"
        }, 411)
    }
    if (await bcrypt.compare(parsedDataPayload.data.password, retrievedUser.authToken)) {
        return c.json({
            message: "Logged in succesfully",
            token: jwt.sign(retrievedUser.id, JWT_SECRET)
        })
    }
    return c.json({
        message: "Invalid username / password"
    }, 411)
})

export default userRouter;