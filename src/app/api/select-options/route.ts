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
      .order('display_order', { ascending: true })
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
    const { category, value, name, code, display_order, is_active, metadata, is_default, is_system, description } = body;

    if (!category || !value || !name) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (category, value, name).' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    
    // Si se establece como predeterminado, quitar predeterminado de los otros de la misma categoría primero
    if (is_default === true) {
      await adminClient
        .from('select_options')
        .update({ is_default: false })
        .eq('category', category);
    }

    const { data, error } = await adminClient
      .from('select_options')
      .insert({
        category,
        value: value.trim(),
        name: name.trim(),
        code: code ? code.trim().toUpperCase() : null,
        display_order: parseInt(display_order, 10) || 0,
        is_active: is_active !== false,
        is_default: is_default === true,
        is_system: is_system === true,
        metadata: metadata || {},
        description: description ? description.trim() : null,
        created_by: authCheck.user?.id
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
    const { id, value, name, code, display_order, is_active, metadata, is_default, is_system, description } = body;

    if (!id || !value || !name) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (id, value, name).' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Obtener la categoría del registro actual
    const { data: currentOpt } = await adminClient
      .from('select_options')
      .select('category, is_system, code')
      .eq('id', id)
      .single();

    if (!currentOpt) {
      return NextResponse.json({ error: 'Opción no encontrada.' }, { status: 404 });
    }

    // Protecciones: code inmutable si es del sistema
    const updateData: Record<string, any> = {
      name: name.trim(),
      display_order: parseInt(display_order, 10) || 0,
      is_active: is_active !== false,
      metadata: metadata || {},
      description: description ? description.trim() : null,
      updated_by: authCheck.user?.id,
      updated_at: new Date().toISOString()
    };

    // Si no es de sistema, permitir cambiar value y code
    if (!currentOpt.is_system) {
      updateData.value = value.trim();
      updateData.code = code ? code.trim().toUpperCase() : null;
      updateData.is_system = is_system === true;
    }

    // Manejar is_default
    if (is_default === true) {
      // Quitar predeterminado a todos los demás de la categoría
      await adminClient
        .from('select_options')
        .update({ is_default: false })
        .eq('category', currentOpt.category);
      updateData.is_default = true;
    } else {
      updateData.is_default = false;
    }

    const { data, error } = await adminClient
      .from('select_options')
      .update(updateData)
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

// DELETE: Eliminar una opción (Solo admin, baja lógica si está en uso o de sistema)
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

    // Obtener información del registro
    const { data: option } = await adminClient
      .from('select_options')
      .select('is_system, name, category')
      .eq('id', id)
      .single();

    if (!option) {
      return NextResponse.json({ error: 'Opción no encontrada.' }, { status: 404 });
    }

    // Protecciones: registros is_system no se eliminan físicamente
    if (option.is_system) {
      // Intentar desactivar en vez de borrar
      const { error: deactivateError } = await adminClient
        .from('select_options')
        .update({ is_active: false })
        .eq('id', id);
      
      if (deactivateError) {
        console.error('Error al desactivar opción de sistema:', deactivateError);
        return NextResponse.json({ error: 'No se pudo desactivar la opción del sistema.' }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'La opción de sistema fue desactivada (baja lógica).' });
    }

    // Verificar si está en uso en contributions
    let inUse = false;
    if (option.category === 'authorization_level') {
      const { count } = await adminClient
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('authorization_level', option.name); // O valor
      inUse = (count || 0) > 0;
    } else if (option.category === 'credit_preference') {
      const { count } = await adminClient
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('credit_preference', option.name);
      inUse = (count || 0) > 0;
    } else if (option.category === 'publication_status') {
      const { count } = await adminClient
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('publication_status_option_id', id);
      inUse = (count || 0) > 0;
    } else if (option.category === 'editorial_indicator') {
      const { count } = await adminClient
        .from('contribution_editorial_indicators')
        .select('*', { count: 'exact', head: true })
        .eq('indicator_option_id', id);
      inUse = (count || 0) > 0;
    }

    // Si está en uso, hacer baja lógica
    if (inUse) {
      const { error: deactivateError } = await adminClient
        .from('select_options')
        .update({ is_active: false })
        .eq('id', id);
      
      if (deactivateError) {
        return NextResponse.json({ error: 'No se pudo desactivar la opción en uso.' }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'La opción está en uso. Se realizó una baja lógica.' });
    }

    // Si no está en uso y no es del sistema, eliminar físicamente
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
