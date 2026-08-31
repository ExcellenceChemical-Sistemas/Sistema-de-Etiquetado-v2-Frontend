import fs from "node:fs";
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-20",
  ssr: false,
  devtools: { enabled: true },
  modules: ["shadcn-nuxt", "@pinia/nuxt", "@vueuse/nuxt"],
  shadcn: {
    prefix: "",
    componentDir: "./app/components/ui",
  },
  css: ["~/assets/css/tailwind.css", "vue-sonner/style.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3000",
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
  app: {
    head: {},
  },
});