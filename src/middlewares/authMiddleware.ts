import { env } from "hono/adapter";
import { Context, MiddlewareHandler } from 'hono';
import jwt from "jsonwebtoken";
import { EnvObject } from "../contracts/app.model";

interface CustomContext {
    Variables: {
        userId: string;
      };
}

export const authMiddleWare: MiddlewareHandler<CustomContext> = async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ message: "Not Authenticated" }, 403);
    }

    const token = authHeader.split(' ').at(1);
    try {
        const JWT_SECRET = (c.env as EnvObject).JWT_SECRET;
        if (!token) {
            return c.json({ message: "Not Authenticated" }, 403);
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        c.set('userId', decoded as string);
        await next()
    }
    catch (err) {
        return c.json({ message: "Not Authenticated" }, 403);
    }
}