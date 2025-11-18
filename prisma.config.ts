import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Prefer "library" runtime to avoid Prisma Accelerate binary download failures.
  // Override with PRISMA_CLIENT_ENGINE_TYPE if you need "binary" or other engine.
  engine: process.env.PRISMA_CLIENT_ENGINE_TYPE || "library",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
