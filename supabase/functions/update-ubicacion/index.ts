// Edge Function para actualizar ubicación del guardia
// Aprovecha Realtime de Supabase para propagar cambios inmediatamente

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
    // Crear cliente de Supabase
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

    // Obtener datos del body
    const { latitud, longitud } = await req.json()

    if (!latitud || !longitud) {
      return new Response(
        JSON.stringify({ error: 'Latitud y longitud son requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validar coordenadas
    if (latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180) {
      return new Response(
        JSON.stringify({ error: 'Coordenadas inválidas' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Buscar el guardia por user_id o email
    const { data: guardia, error: findError } = await supabaseClient
      .from('guardias')
      .select('id')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .single()

    if (findError || !guardia) {
      return new Response(
        JSON.stringify({ error: 'Guardia no encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Actualizar ubicación
    const { data, error } = await supabaseClient
      .from('guardias')
      .update({
        latitud,
        longitud,
        ultima_actualizacion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', guardia.id)
      .select()
      .single()

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

