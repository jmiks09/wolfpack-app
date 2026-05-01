import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/wolfpack-app/', // 👈 replace "wolfpack" with your exact GitHub repo name
})
