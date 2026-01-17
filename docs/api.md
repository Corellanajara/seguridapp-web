# API de SeguridApp

## Autenticación

Todas las peticiones requieren un header `x-api-key` con tu API key.

## Endpoints

### GET /api/asistencias

Obtiene las últimas 100 asistencias.

**Headers:**
- `x-api-key`: Tu API key

**Response:**
```json
[
  {
    "id": "uuid",
    "guardia_id": "uuid",
    "tipo_asistencia": "entrada",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

## Webhooks

Los webhooks se configuran desde el dashboard de Supabase.

Eventos disponibles:
- `asistencia.created`
- `incidente.created`
- `alerta_zona.created`
