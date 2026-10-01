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
    head: {
      htmlAttrs: { lang: "es" },
      title: "Excellence Chemical — Sistema de Gestión",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#f97316" },
        // Safari/iOS no lee manifest.webmanifest: necesita sus propias meta tags para instalar como PWA.
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
        { name: "apple-mobile-web-app-title", content: "Excellence Chemical" },
      ],
      link: [
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/excellence-chemical-icon.png" },
      ],
    },
  },
});