import { seedDatabase } from "./seed-helper";

export default async function globalSetup() {
  seedDatabase();
}

