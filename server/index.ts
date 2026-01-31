import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import chatRoute from "./api/chat.js";

const app = new Hono();

app.use("/api/*", cors());
app.route("/api/chat", chatRoute);

export default app;
