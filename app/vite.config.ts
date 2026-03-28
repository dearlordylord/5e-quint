import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tailwindcss(), react(), tsconfigPaths({ projects: ["./tsconfig.json"] })],
  server: {
    allowedHosts: ["determined_johnson.orb.local"]
  },
  preview: {
    allowedHosts: ["dnd-quint.dearlordylord.com", "5e-quint.dearlordylord.com"]
  }
})
