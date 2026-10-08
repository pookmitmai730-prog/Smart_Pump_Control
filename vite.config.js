import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 1. นำเข้าปลั๊กอิน Tailwind v4

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 2. สั่งให้ปลั๊กอินทำงานในระบบ Vite
  ],
})