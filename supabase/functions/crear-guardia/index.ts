// Edge Function para crear guardia con usuario de autenticación
// Crea automáticamente el usuario en Supabase Auth y lo vincula con el guardia

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase con anon key para validar usuario
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Obtener usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verificar que el usuario no sea guardia (solo admins pueden crear guardias)
    const { data: guardiaExistente, error: guardiaError } = await supabaseClient
      .from('guardias')
      .select('id')
      .eq('user_id', user.id)
      .single()

    // Si encuentra un guardia con este user_id, significa que es guardia, no admin
    if (guardiaExistente && !guardiaError) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para crear guardias' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Obtener datos del body
    const { nombre, apellido, email, telefono, password, activo } = await req.json()

    // Validar datos requeridos
    if (!nombre || !apellido || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Nombre, apellido, email y contraseña son requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validar longitud mínima de contraseña
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Crear cliente con service_role para poder crear usuarios
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verificar si el email ya existe en Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some(u => u.email === email)

    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'El email ya está registrado' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
    })

    if (authError || !authUser?.user) {
      return new Response(
        JSON.stringify({ error: authError?.message || 'Error al crear usuario' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Crear registro en la tabla guardias
    const { data: guardia, error: guardiaCreateError } = await supabaseAdmin
      .from('guardias')
      .insert([
        {
          user_id: authUser.user.id,
          nombre,
          apellido,
          email,
          telefono: telefono || null,
          activo: activo !== undefined ? activo : true,
        },
      ])
      .select()
      .single()

    if (guardiaCreateError) {
      // Si falla la creación del guardia, intentar eliminar el usuario creado
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      
      return new Response(
        JSON.stringify({ error: guardiaCreateError.message || 'Error al crear guardia' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data: guardia }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
