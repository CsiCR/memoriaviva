import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// Helper to check admin access
async function checkAdminAccess() {
  const userSupabase = await createClient();
  const { data: { user } } = await userSupabase.auth.getUser();

  if (!user) {
    return { error: 'No autorizado. Inicie sesión.', status: 401 };
  }

  const { data: profile, error: profileError } = await userSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return { error: 'No autorizado. Se requieren permisos de administrador.', status: 403 };
  }

  return { user, profile };
}

// GET: Obtener opciones de selección
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'all';
    
    const supabase = await createClient();
    
    let query = supabase
      .from('select_options')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (category !== 'all') {
      query = query.eq('category', category).eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al consultar opciones de selección:', error);
      return NextResponse.json({ error: 'Error al consultar opciones de selección.' }, { status: 500 });
    }

    if (category !== 'all') {
      return NextResponse.json(data);
    }

    // Agrupar por categoría para retornar todo en un solo llamado
    const grouped = data.reduce((acc: Record<string, any[]>, curr) => {
      if (!acc[curr.category]) {
        acc[curr.category] = [];
      }
      acc[curr.category].push(curr);
      return acc;
    }, {});

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Error interno en GET select-options:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// POST: Crear una nueva opción (Solo admin)
export async function POST(req: NextRequest) {
  try {
    const authCheck = await checkAdminAccess();
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json();
    const { category, value, label, code, sort_order, is_active } = body;

    if (!category || !value || !label) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (category, value, label).' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('select_options')
      .insert({
        category,
        value: value.trim(),
        label: label.trim(),
        code: code ? code.trim().toUpperCase() : null,
        sort_order: parseInt(sort_order, 10) || 0,
        is_active: is_active !== false
      })
      .select()
      .single();

    if (error) {
      console.error('Error al insertar opción de selección:', error);
      return NextResponse.json({ error: 'Error al registrar la opción.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, option: data });
  } catch (error) {
    console.error('Error interno en POST select-options:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// PUT: Modificar una opción existente (Solo admin)
export async function PUT(req: NextRequest) {
  try {
    const authCheck = await checkAdminAccess();
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json();
    const { id, value, label, code, sort_order, is_active } = body;

    if (!id || !value || !label) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (id, value, label).' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('select_options')
      .update({
        value: value.trim(),
        label: label.trim(),
        code: code ? code.trim().toUpperCase() : null,
        sort_order: parseInt(sort_order, 10) || 0,
        is_active: is_active !== false
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar opción de selección:', error);
      return NextResponse.json({ error: 'Error al actualizar la opción.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, option: data });
  } catch (error) {
    console.error('Error interno en PUT select-options:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// DELETE: Eliminar una opción (Solo admin)
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await checkAdminAccess();
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de la opción es requerido.' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('select_options')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar opción de selección:', error);
      return NextResponse.json({ error: 'Error al eliminar la opción de la base de datos.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error interno en DELETE select-options:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
