// Endpoint de Health Check Detallado
// Archivo: src/app/api/health/route.ts

import { NextResponse } from "next/server";
import { clientEnv } from "@/lib/config/env";
import { createAdminClient } from "@/utils/supabase/admin";
import * as fs from "fs";
import * as path from "path";

interface ReleaseInfo {
  version: string;
  gitCommit: string;
}

function loadReleaseManifest(): ReleaseInfo | null {
  try {
    const filePath = path.join(process.cwd(), "public", "release-manifest.json");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(content);
      return {
        version: data.version || clientEnv.NEXT_PUBLIC_RELEASE_VERSION,
        gitCommit: data.gitCommit || "unknown",
      };
    }
  } catch (error) {
    console.error("Error reading release manifest in health check:", error);
  }
  return null;
}

export async function GET() {
  let databaseStatus = "ok";
  let storageStatus = "ok";
  let overallStatus = "ok";

  // 1. Verificar conectividad con Supabase Database
  try {
    const supabase = createAdminClient();
    // Query rápido a select_options para validar conexión y RLS
    const { error } = await supabase
      .from("select_options")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (error) {
      databaseStatus = "error";
      overallStatus = "degraded";
    }
  } catch (err) {
    databaseStatus = "unreachable";
    overallStatus = "degraded";
  }

  // 2. Verificar conectividad con Supabase Storage (Buckets)
  try {
    const supabase = createAdminClient();
    // Listar buckets para verificar conectividad de storage
    const { data: buckets, error: storageErr } = await supabase.storage.listBuckets();
    if (storageErr || !buckets) {
      storageStatus = "error";
      overallStatus = "degraded";
    }
  } catch (err) {
    storageStatus = "unreachable";
    overallStatus = "degraded";
  }

  // 3. Cargar información de versión/release
  const releaseInfo = loadReleaseManifest();

  return NextResponse.json({
    status: overallStatus,
    environment: clientEnv.NEXT_PUBLIC_APP_ENV,
    version: clientEnv.NEXT_PUBLIC_RELEASE_VERSION,
    checks: {
      application: "ok",
      database: databaseStatus,
      storage: storageStatus,
    },
    ...(releaseInfo
      ? {
          release: {
            version: releaseInfo.version,
            commit: releaseInfo.gitCommit,
          },
        }
      : {}),
  });
}
