import { execSync } from "node:child_process";

export function seedDatabase() {
  execSync("node prisma/seed.cjs", {
    stdio: "inherit"
  });
}

