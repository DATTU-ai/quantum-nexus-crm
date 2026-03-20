import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: "backend/.env" });

export default defineConfig({
  schema: "backend/prisma/schema.prisma",
  migrations: {
    path: "backend/prisma/migrations",
    seed: "node backend/prisma/seed.js",
  },
});
