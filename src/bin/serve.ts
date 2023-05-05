#!/usr/bin/env node
import "reflect-metadata";

import { App } from "../main/app.js";

const app = new App();

try {
  await app.start();
} catch (error) {
  console.log(error);
  app.logger.error("Failed to start", error as any);
  process.exit(1);
}
