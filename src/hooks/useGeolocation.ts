import { useState, useEffect } from 'react'

interface GeolocationState {
  latitud: number | null
  longitud: number | null
  error: string | null
  loading: boolean
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    latitud: null,
    longitud: null,
    error: null,
    loading: true,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        latitud: null,
        longitud: null,
        error: 'Geolocalización no soportada por este navegador',
        loading: false,
      })
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          error: null,
          loading: false,
        })
      },
      (error) => {
        let errorMessage = 'Error desconocido al obtener la ubicación'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Por favor, permite el acceso a la ubicación.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible'
            break
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado al obtener la ubicación'
            break
        }

        setState({
          latitud: null,
          longitud: null,
          error: errorMessage,
          loading: false,
        })
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000,
        maximumAge: options.maximumAge ?? 0,
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [options.enableHighAccuracy, options.timeout, options.maximumAge])

  return state
}

