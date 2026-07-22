// Route Handler para servir archivos multimedia públicos de forma segura
// Archivo: src/app/api/public/media/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isUsableEditorialFile } from "@/lib/editorial/editorialConstants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = createAdminClient();

    // 1. Obtener la ID del estado de publicación "published"
    const { data: opt, error: optErr } = await supabase
      .from("select_options")
      .select("id")
      .eq("category", "publication_status")
      .eq("code", "published")
      .maybeSingle();

    if (optErr) {
      console.error("Error al obtener estado de publicación:", optErr);
      return new NextResponse("Internal Server Error", { status: 500 });
    }

    const publishedOptId = opt?.id || "00000000-0000-0000-0000-000000000000";

    // 2. Consultar el archivo y los campos de publicación del aporte asociado
    const { data: file, error: fileErr } = await supabase
      .from("contribution_files")
      .select(`
        id,
        file_name,
        file_path,
        file_type,
        file_role,
        processing_status,
        contribution:contributions(
          consent_verified,
          authorization_level,
          publication_status_option_id
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (fileErr) {
      console.error("Error al buscar archivo en base de datos:", fileErr);
      return new NextResponse("Internal Server Error", { status: 500 });
    }

    if (!file) {
      return new NextResponse("File Not Found", { status: 404 });
    }

    // 3. Verificar si el archivo es elegible (no es consentimiento, etc.)
    const isUsable = isUsableEditorialFile({
      id: file.id,
      file_name: file.file_name,
      file_role: file.file_role,
      processing_status: file.processing_status,
    });

    if (!isUsable) {
      return new NextResponse("Access Denied (Invalid File Type or Role)", { status: 403 });
    }

    // 4. Validar las políticas de exposición pública de la contribución asociada
    const contribution = file.contribution as any;
    if (
      !contribution ||
      !contribution.consent_verified ||
      contribution.authorization_level !== "A" ||
      contribution.publication_status_option_id !== publishedOptId
    ) {
      return new NextResponse("Unauthorized (Contribution is not public)", { status: 403 });
    }

    // 5. Descargar el archivo del storage privado
    const { data: buffer, error: downloadErr } = await supabase.storage
      .from("historical-uploads")
      .download(file.file_path);

    if (downloadErr || !buffer) {
      console.error("Error al descargar el archivo del Storage:", downloadErr);
      return new NextResponse("Error retrieving file from storage", { status: 500 });
    }

    // 6. Retornar la respuesta con el tipo de contenido y cabeceras de cache
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file.file_type || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Fallo inesperado al servir archivo:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
