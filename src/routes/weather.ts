import { Hono } from "hono";
import { authMiddleWare } from "../middlewares/authMiddleware";
import { Prisma, PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { ApiEndpoints, EnvObject } from "../contracts/app.model";
import { z } from "zod";

const weatherRouter = new Hono<{Bindings: EnvObject}>();


const WeatherObject = z.object({
    location: z.string().min(1, "Location is required"),
})

weatherRouter.get('/', authMiddleWare, async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());

    const retrievedUser = prisma.user.findFirst({
        where: {
            id: c.get('userId')
        }
    })
    if (!retrievedUser) {
        return c.json({ message: "User not found" }, 404);
    }
    const weatherRequestData = WeatherObject.safeParse(await c.req.json());
    if (!weatherRequestData.success || weatherRequestData.error) {
        const firstError = weatherRequestData.error?.errors.at(0);
        return c.json({
            path: firstError?.path[0],
            message: firstError?.message
        }, 411);
    }
    try {
        const weatherResponse = await fetch(`${c.env.API_BASE_URL}${ApiEndpoints.CURRENT_WEATHER}?q=${weatherRequestData.data.location}&lang=eng&key=${c.env.MY_API_KEY}`);
        const weatherData: { current?: any; error?: any } = await weatherResponse.json();
        console.log(weatherData);
        return weatherData?.current ? c.json(weatherData) : c.json({ message: "No weather data found" }, 404);
    }
    catch (err) {
        console.log(err);
        return c.json({ message: "Error fetching weather data" }, 500);
    }
})

export default weatherRouter;