// Validación de Variables de Entorno usando Zod
// Archivo: src/lib/config/env.ts

import { z } from "zod";
import * as dotenv from "dotenv";
import * as path from "path";

// Cargar variables de archivos .env en el servidor (desarrollo, testing, seeds)
if (typeof window === "undefined") {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
}


const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "preview", "staging", "production"])
    .default("development"),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .catch("http://localhost:3000")
    .transform((val) => val.replace(/\/$/, "")), // Remover slash final si existe
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL debe ser un URL válido"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY no puede estar vacío"),
  NEXT_PUBLIC_ANALYTICS_ENABLED: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .default(false),
  NEXT_PUBLIC_RELEASE_VERSION: z.string().default("1.0.0"),
  NEXT_PUBLIC_SHOW_BETA_BANNER: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .default(false),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY no puede estar vacío"),
});

// Resolver variables del lado cliente de forma segura
const rawClientEnv = {
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 
                        process.env.PUBLIC_SITE_URL || 
                        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined), // compatibilidad y Vercel Preview URL
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
  NEXT_PUBLIC_RELEASE_VERSION: process.env.NEXT_PUBLIC_RELEASE_VERSION,
  NEXT_PUBLIC_SHOW_BETA_BANNER: process.env.NEXT_PUBLIC_SHOW_BETA_BANNER,
};

const clientResult = clientEnvSchema.safeParse(rawClientEnv);

if (!clientResult.success) {
  console.error("❌ Error de validación en variables de entorno cliente:", clientResult.error.format());
  throw new Error("Variables de entorno cliente inválidas.");
}

export const clientEnv = clientResult.data;

// Cargar variables de servidor sólo si estamos en ambiente node (servidor)
let serverEnvData: z.infer<typeof serverEnvSchema> | null = null;
if (typeof window === "undefined") {
  const serverResult = serverEnvSchema.safeParse(process.env);
  if (!serverResult.success) {
    console.error("❌ Error de validación en variables de entorno servidor:", serverResult.error.format());
    throw new Error("Variables de entorno servidor inválidas.");
  }
  serverEnvData = serverResult.data;
}

export const serverEnv = serverEnvData;
