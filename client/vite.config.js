import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,
    https: true,
    proxy: {
      "/api": {
        target: "http://10.180.20.174:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://10.180.20.174:5000",
        ws: true,
      },
    },
  },
});
