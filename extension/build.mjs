
import { build } from "vite";
import { copyFile, mkdir } from "node:fs/promises";

await build();

await mkdir("dist/assets", { recursive: true });

await copyFile("manifest.json", "dist/manifest.json");
await copyFile(
  "src/content/overlay.css",
  "dist/assets/overlay.css"
);

console.log("CivicPilot extension built successfully.");
