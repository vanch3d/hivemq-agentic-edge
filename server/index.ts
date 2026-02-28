import dotenv from "dotenv";

// override: true ensures changed .env values are picked up on HMR re-evaluation
dotenv.config({ override: true });
import { Hono } from "hono";
import { cors } from "hono/cors";
import chatRoute from "./api/chat.js";
import ontologyRoute, { aboutRoute } from "./api/ontology.js";
import settingsRoute from "./api/settings.js";

const app = new Hono();

app.use("/api/*", cors());
app.route("/api/chat", chatRoute);
app.route("/api/ontology", ontologyRoute);
app.route("/api/settings", settingsRoute);
app.route("/api/about", aboutRoute);

export default app;
