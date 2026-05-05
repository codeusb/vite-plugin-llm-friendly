import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { llmFriendlyPlugin, llmTxtPlugin } from "../../dist/index.mjs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), llmFriendlyPlugin(), llmTxtPlugin()],
});
