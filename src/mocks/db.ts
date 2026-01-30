import { Collection } from "@msw/data";
import { z } from "zod/v4";

const userSchema = z.object({
  username: z.string(),
  password: z.string(),
  roles: z.array(z.string()),
});

export const users = new Collection({ schema: userSchema });

// Seed default admin user
users.create({ username: "admin", password: "admin", roles: ["admin"] });
