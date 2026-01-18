import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ubicacionService } from '@/services/ubicacion'
import { asistenciasService } from '@/services/asistencias'
import { zonasService } from '@/services/zonas'
import { Guardia, Asistencia, AsignacionZonaConDetalles, Zona } from '@/types'
import { useGeolocation } from '@/hooks/useGeolocation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin, Navigation, LogOut, CheckCircle2, AlertCircle, Loader2, Camera, Clock, FileSignature, X, Shield, FileText, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { MapContainer, TileLayer, Marker, Polygon, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import FirmaDialog from '@/components/FirmaDialog'
import { firmaService, FirmaData } from '@/services/firma'
import { documentosService } from '@/services/documentos'
import { AsignacionDocumentoConDetalles } from '@/types'

// Fix para los iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView([lat, lng], 13)
  }, [lat, lng, map])

  return null
}

export default function GuardiaApp() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [guardia, setGuardia] = useState<Guardia | null>(null)
  const [loading, setLoading] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)
  const [zonasAsignadas, setZonasAsignadas] = useState<AsignacionZonaConDetalles[]>([])
  const [cargandoZonas, setCargandoZonas] = useState(false)
  const intervaloRef = useRef<NodeJS.Timeout | null>(null)
  
  // Estados para control de asistencia
  const [mostrarCamara, setMostrarCamara] = useState(false)
  const [mostrarFirma, setMostrarFirma] = useState(false)
  const [firmaData, setFirmaData] = useState<FirmaData | null>(null)
  const [tipoAsistencia, setTipoAsistencia] = useState<'entrada' | 'salida' | null>(null)
  const [registrandoAsistencia, setRegistrandoAsistencia] = useState(false)
  const [ultimaAsistencia, setUltimaAsistencia] = useState<Asistencia | null>(null)
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null) // Guardar la foto capturada
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  // Estados para documentos pendientes
  const [documentosPendientes, setDocumentosPendientes] = useState<AsignacionDocumentoConDetalles[]>([])
  const [cargandoDocumentos, setCargandoDocumentos] = useState(false)
  const [mostrarFirmaDocumento, setMostrarFirmaDocumento] = useState(false)
  const [asignacionDocumentoActual, setAsignacionDocumentoActual] = useState<AsignacionDocumentoConDetalles | null>(null)
  const [firmandoDocumento, setFirmandoDocumento] = useState(false)

  const { latitud, longitud, error: geoError, loading: geoLoading, requestLocation } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0, // Siempre obtener ubicación fresca
  })
  
  // Verificar si el permiso está denegado
  const permisoDenegado = geoError?.includes('denegado') || geoError?.includes('Permiso de ubicación denegado')
  
  // Verificar si el error es de timeout (no debería bloquear la actualización)
  const esErrorTimeout = geoError?.includes('Tiempo de espera agotado') || geoError?.includes('timeout')

  useEffect(() => {
    cargarPerfil()
    cargarUltimaAsistencia()
  }, [])

  useEffect(() => {
    if (guardia) {
      cargarDocumentosPendientes()
    }
  }, [guardia])

  useEffect(() => {
    if (guardia) {
      cargarZonasAsignadas()
    }
  }, [guardia])

  useEffect(() => {
    // Si tenemos ubicación y guardia, actualizar automáticamente
    if (latitud && longitud && guardia && !actualizando) {
      actualizarUbicacion()
    }
  }, [latitud, longitud])

  // Actualizar cada 30 segundos automáticamente
  useEffect(() => {
    if (guardia && latitud && longitud) {
      intervaloRef.current = setInterval(() => {
        if (!actualizando) {
          actualizarUbicacion()
        }
      }, 30000) // 30 segundos

      return () => {
        if (intervaloRef.current) {
          clearInterval(intervaloRef.current)
        }
      }
    }
  }, [guardia, latitud, longitud, actualizando])

  const cargarPerfil = async () => {
    try {
      const data = await ubicacionService.getMiPerfil()
      setGuardia(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cargar tu perfil',
        variant: 'destructive',
      })
      if (error.message?.includes('no encontrado')) {
        // Si no es guardia, redirigir al login
        setTimeout(() => {
          signOut()
          navigate('/login')
        }, 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  const cargarZonasAsignadas = async () => {
    if (!guardia) return
    
    setCargandoZonas(true)
    try {
      const asignaciones = await zonasService.getAsignacionesActivasByGuardia(guardia.id)
      setZonasAsignadas(asignaciones)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar las zonas asignadas',
        variant: 'destructive',
      })
    } finally {
      setCargandoZonas(false)
    }
  }

  // Calcular el área de una zona en metros cuadrados
  const calcularAreaZona = (zona: Zona): number => {
    try {
      const coordenadas = JSON.parse(zona.coordenadas)
      
      if (zona.tipo === 'circulo') {
        const { radio } = coordenadas
        return Math.PI * radio * radio // Área del círculo en m²
      } else {
        // Calcular área del polígono usando fórmula de Shoelace adaptada para coordenadas geográficas
        const puntos = Array.isArray(coordenadas)
          ? coordenadas.map((p: { lat: number; lng: number }) => ({ lat: p.lat, lng: p.lng }))
          : []
        
        if (puntos.length < 3) return 0
        
        // Usar fórmula de área esférica (aproximación para polígonos pequeños)
        const R = 6371000 // Radio de la Tierra en metros
        let area = 0
        
        for (let i = 0; i < puntos.length; i++) {
          const j = (i + 1) % puntos.length
          const lat1 = (puntos[i].lat * Math.PI) / 180
          const lng1 = (puntos[i].lng * Math.PI) / 180
          const lat2 = (puntos[j].lat * Math.PI) / 180
          const lng2 = (puntos[j].lng * Math.PI) / 180
          
          area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
        }
        
        area = Math.abs(area * R * R / 2)
        return area
      }
    } catch (error) {
      console.error('Error al calcular área de zona:', error)
      return 0
    }
  }

  // Calcular distancia desde la ubicación del guardia hasta la zona
  const calcularDistanciaAZona = (zona: Zona): number | null => {
    if (!latitud || !longitud) return null
    
    try {
      const coordenadas = JSON.parse(zona.coordenadas)
      
      if (zona.tipo === 'circulo') {
        const { lat, lng, radio } = coordenadas
        // Distancia al centro del círculo menos el radio
        const distanciaCentro = zonasService.calcularDistancia(latitud, longitud, lat, lng)
        return Math.max(0, distanciaCentro - radio) // Si está dentro, distancia es 0
      } else {
        // Para polígonos, calcular distancia al punto más cercano del polígono
        const puntos = Array.isArray(coordenadas)
          ? coordenadas.map((p: { lat: number; lng: number }) => [p.lat, p.lng])
          : []
        
        if (puntos.length < 3) return null
        
        // Verificar si está dentro del polígono
        const estaDentro = zonasService.puntoEnPoligono(latitud, longitud, coordenadas)
        if (estaDentro) return 0
        
        // Calcular distancia mínima a cualquier borde del polígono
        let distanciaMinima = Infinity
        for (let i = 0; i < puntos.length; i++) {
          const j = (i + 1) % puntos.length
          const distancia = zonasService.calcularDistancia(
            latitud,
            longitud,
            puntos[i][0],
            puntos[i][1]
          )
          distanciaMinima = Math.min(distanciaMinima, distancia)
        }
        return distanciaMinima
      }
    } catch (error) {
      console.error('Error al calcular distancia a zona:', error)
      return null
    }
  }

  // Formatear área en unidades legibles
  const formatearArea = (areaM2: number): string => {
    if (areaM2 < 10000) {
      return `${areaM2.toFixed(0)} m²`
    } else if (areaM2 < 1000000) {
      return `${(areaM2 / 10000).toFixed(2)} hectáreas`
    } else {
      return `${(areaM2 / 1000000).toFixed(2)} km²`
    }
  }

  // Formatear distancia en unidades legibles
  const formatearDistancia = (distanciaM: number): string => {
    if (distanciaM < 1000) {
      return `${distanciaM.toFixed(0)} m`
    } else {
      return `${(distanciaM / 1000).toFixed(2)} km`
    }
  }

  const actualizarUbicacion = async () => {
    if (actualizando) return

    // Si hay error de timeout y no tenemos ubicación, intentar obtenerla primero
    if (esErrorTimeout && (!latitud || !longitud)) {
      toast({
        title: 'Obteniendo ubicación...',
        description: 'Intentando obtener tu ubicación nuevamente',
      })
      requestLocation()
      return
    }

    // Si no hay ubicación y no es timeout, no podemos actualizar
    if (!latitud || !longitud) {
      toast({
        title: 'Error',
        description: 'No se pudo obtener la ubicación. Por favor, intenta obtener tu ubicación primero.',
        variant: 'destructive',
      })
      return
    }

    setActualizando(true)
    try {
      await ubicacionService.updateMiUbicacion(latitud, longitud)
      setUltimaActualizacion(new Date())
      
      // Actualizar el estado local del guardia
      setGuardia((prev) => 
        prev ? {
          ...prev,
          latitud,
          longitud,
          ultima_actualizacion: new Date().toISOString(),
        } : null
      )
    } catch (error: any) {
      toast({
        title: 'Error al actualizar ubicación',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setActualizando(false)
    }
  }
  

  const handleSignOut = async () => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current)
    }
    await signOut()
    navigate('/login')
  }

  const cargarUltimaAsistencia = async () => {
    try {
      const asistencia = await asistenciasService.getUltimaAsistencia()
      setUltimaAsistencia(asistencia)
    } catch (error) {
      // Si no hay asistencias, está bien
      console.log('No hay asistencias previas')
    }
  }

  const cargarDocumentosPendientes = async () => {
    if (!guardia) return
    
    setCargandoDocumentos(true)
    try {
      const documentos = await documentosService.getDocumentosPendientesFirma()
      setDocumentosPendientes(documentos)
    } catch (error: any) {
      // Si no hay documentos pendientes, está bien
      console.log('No hay documentos pendientes:', error.message)
      setDocumentosPendientes([])
    } finally {
      setCargandoDocumentos(false)
    }
  }

  const handleFirmarDocumento = (asignacion: AsignacionDocumentoConDetalles) => {
    setAsignacionDocumentoActual(asignacion)
    setMostrarFirmaDocumento(true)
  }

  const handleFirmaDocumentoCompleta = async (firma: FirmaData) => {
    if (!asignacionDocumentoActual) return

    setFirmandoDocumento(true)
    try {
      await documentosService.firmarDocumento(asignacionDocumentoActual.id, firma)
      
      toast({
        title: 'Documento firmado',
        description: `Has firmado el documento "${asignacionDocumentoActual.documento?.nombre}" correctamente`,
      })

      // Recargar documentos pendientes
      await cargarDocumentosPendientes()
      
      setMostrarFirmaDocumento(false)
      setAsignacionDocumentoActual(null)
    } catch (error: any) {
      toast({
        title: 'Error al firmar documento',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setFirmandoDocumento(false)
    }
  }

  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }, // Cámara frontal
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error: any) {
      toast({
        title: 'Error al acceder a la cámara',
        description: error.message || 'No se pudo acceder a la cámara',
        variant: 'destructive',
      })
      setMostrarCamara(false)
    }
  }

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const capturarFoto = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current || !canvasRef.current) {
        reject(new Error('Cámara no disponible'))
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) {
        reject(new Error('No se pudo obtener el contexto del canvas'))
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      // Convertir a base64
      const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8)
      resolve(fotoBase64)
    })
  }

  const subirFoto = async (fotoBase64: string): Promise<string> => {
    try {
      // Convertir base64 a blob
      const response = await fetch(fotoBase64)
      const blob = await response.blob()

      // Generar nombre único para el archivo
      const fileName = `asistencias/${guardia?.id}/${Date.now()}.jpg`
      const filePath = `${fileName}`

      // Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from('fotos-asistencias')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (error) {
        // Si el bucket no existe o hay error de permisos, usar base64
        console.warn('Error al subir foto al storage, usando base64 como fallback:', error.message)
        return fotoBase64
      }

      // Obtener URL pública (si el bucket es público) o firmada (si es privado)
      const { data: urlData } = supabase.storage
        .from('fotos-asistencias')
        .getPublicUrl(filePath)

      // Si el bucket es privado, necesitamos una URL firmada
      // Por ahora usamos la URL pública, pero si falla, usamos base64
      return urlData.publicUrl || fotoBase64
    } catch (error: any) {
      // Si falla el storage, usar base64 como fallback
      console.warn('Error al subir foto, usando base64:', error.message)
      return fotoBase64
    }
  }

  const handleFirmaCompleta = (firma: FirmaData) => {
    setFirmaData(firma)
    // Continuar con el registro de asistencia pasando la firma directamente
    procesarAsistenciaConFirma(firma)
  }

  const procesarAsistenciaConFirma = async (firma?: FirmaData) => {
    // Usar la firma pasada como parámetro o la del estado
    const firmaParaUsar = firma || firmaData
    
    if (!tipoAsistencia || !latitud || !longitud || !firmaParaUsar || !fotoCapturada) {
      toast({
        title: 'Error',
        description: 'Faltan datos para registrar la asistencia. Por favor, intenta nuevamente.',
        variant: 'destructive',
      })
      return
    }

    setRegistrandoAsistencia(true)

    try {
      // Usar la foto ya capturada (no intentar capturar de nuevo)
      const fotoBase64 = fotoCapturada
      
      // Subir foto
      const fotoUrl = await subirFoto(fotoBase64)

      // Validar firma
      const validacion = firmaService.validarFirma(firmaParaUsar)
      if (!validacion.valido) {
        toast({
          title: 'Advertencia',
          description: validacion.mensaje || 'La firma no es válida',
          variant: 'destructive',
        })
      }

      // Almacenar firma
      await firmaService.almacenarFirma(firmaParaUsar, `asistencia_${tipoAsistencia}_${Date.now()}`)
      const firmaDocumental = JSON.stringify(firmaParaUsar)

      // Registrar asistencia
      const asistencia = await asistenciasService.crearAsistencia({
        tipo_asistencia: tipoAsistencia,
        foto_url: fotoUrl,
        latitud,
        longitud,
        firma_documental: firmaDocumental,
        firma_clave_unica: firmaParaUsar.tipo === 'electronica' || firmaParaUsar.tipo === 'clave_unica',
        observaciones: `Registro de ${tipoAsistencia} georeferenciado con firma ${firmaParaUsar.tipo}`,
      })

      toast({
        title: 'Asistencia registrada',
        description: `Se registró tu ${tipoAsistencia} correctamente`,
      })

      // Actualizar última asistencia
      setUltimaAsistencia(asistencia)
      setMostrarCamara(false)
      setMostrarFirma(false)
      setTipoAsistencia(null)
      setFirmaData(null)
      setFotoCapturada(null) // Limpiar la foto capturada
      detenerCamara()
    } catch (error: any) {
      const errorMessage = error?.message || error?.details || error?.hint || 'No se pudo registrar la asistencia'
      
      // Si el error es de sesión expirada, redirigir al login
      if (errorMessage.includes('sesión ha expirado') || errorMessage.includes('inicia sesión nuevamente')) {
        toast({
          title: 'Sesión expirada',
          description: 'Tu sesión ha expirado. Serás redirigido al login.',
          variant: 'destructive',
        })
        setTimeout(() => {
          signOut()
          navigate('/login')
        }, 2000)
      } else {
        toast({
          title: 'Error al registrar asistencia',
          description: errorMessage,
          variant: 'destructive',
        })
        // Limpiar estados en caso de error para permitir reintento
        setFotoCapturada(null)
        setFirmaData(null)
        setMostrarFirma(false)
      }
    } finally {
      setRegistrandoAsistencia(false)
    }
  }

  const registrarAsistencia = async (tipo: 'entrada' | 'salida') => {
    if (!latitud || !longitud) {
      toast({
        title: 'Error',
        description: 'No se pudo obtener tu ubicación. Por favor, espera un momento.',
        variant: 'destructive',
      })
      return
    }

    setTipoAsistencia(tipo)
    setMostrarCamara(true)
  }

  const confirmarAsistencia = async () => {
    if (!tipoAsistencia || !latitud || !longitud) {
      toast({
        title: 'Error',
        description: 'Faltan datos para registrar la asistencia',
        variant: 'destructive',
      })
      return
    }

    try {
      // Capturar la foto ANTES de detener la cámara
      const fotoBase64 = await capturarFoto()
      
      // Guardar la foto capturada en el estado
      setFotoCapturada(fotoBase64)
      
      // Cerrar cámara y mostrar diálogo de firma
      detenerCamara()
      setMostrarCamara(false)
      setMostrarFirma(true)
    } catch (error: any) {
      toast({
        title: 'Error al capturar foto',
        description: error.message || 'No se pudo capturar la foto. Por favor, intenta nuevamente.',
        variant: 'destructive',
      })
    }
  }

  const cancelarCamara = () => {
    detenerCamara()
    setMostrarCamara(false)
    setTipoAsistencia(null)
    setFotoCapturada(null) // Limpiar la foto si se cancela
  }

  useEffect(() => {
    if (mostrarCamara) {
      iniciarCamara()
    } else {
      detenerCamara()
    }

    return () => {
      detenerCamara()
    }
  }, [mostrarCamara])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-lg">Cargando tu perfil...</div>
        </div>
      </div>
    )
  }

  if (!guardia) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              No se encontró tu perfil de guardia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignOut} className="w-full">
              Volver al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={guardia.foto_url} />
              <AvatarFallback className="text-xl">
                {guardia.nombre.charAt(0)}
                {guardia.apellido.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                {guardia.nombre} {guardia.apellido}
              </h1>
              <p className="text-muted-foreground">{guardia.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Salir
          </Button>
        </div>

        {/* Estado de Geolocalización */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Estado de Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {geoLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Obteniendo ubicación...</span>
              </div>
            )}

            {geoError && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{geoError}</span>
              </div>
            )}

            {latitud && longitud && !geoError && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Ubicación activa</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Latitud: {latitud.toFixed(6)}</p>
                  <p>Longitud: {longitud.toFixed(6)}</p>
                </div>
                {ultimaActualizacion && (
                  <div className="text-xs text-muted-foreground">
                    Última actualización: {ultimaActualizacion.toLocaleTimeString('es-AR')}
                  </div>
                )}
                {actualizando && (
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Actualizando ubicación...</span>
                  </div>
                )}
              </div>
            )}

            {/* Botones de control de ubicación */}
            <div className="flex gap-2">
              {permisoDenegado ? (
                <Button
                  onClick={requestLocation}
                  disabled={geoLoading}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  {geoLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Solicitando...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      Pedir permiso de ubicación
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={requestLocation}
                  disabled={geoLoading}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  {geoLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Obteniendo...
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4" />
                      Obtener ubicación actual
                    </>
                  )}
                </Button>
              )}
              
              <Button
                onClick={actualizarUbicacion}
                disabled={actualizando || permisoDenegado}
                className="flex-1 gap-2"
                title={permisoDenegado ? 'Permiso de ubicación denegado. Solicita permiso primero.' : ''}
              >
                <MapPin className="h-4 w-4" />
                {actualizando ? 'Actualizando...' : 'Actualizar Ubicación'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Zonas Asignadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Zonas Asignadas
            </CardTitle>
            <CardDescription>
              Zonas de seguridad donde estás asignado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cargandoZonas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : zonasAsignadas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tienes zonas asignadas actualmente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {zonasAsignadas.map((asignacion) => {
                  const zona = asignacion.zona
                  if (!zona) return null
                  
                  const area = calcularAreaZona(zona)
                  const distancia = calcularDistanciaAZona(zona)
                  
                  return (
                    <Card key={asignacion.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div>
                              <h3 className="font-semibold">{zona.nombre}</h3>
                              {zona.descripcion && (
                                <p className="text-sm text-muted-foreground">{zona.descripcion}</p>
                              )}
                            </div>
                            
                            {/* Información de tamaño y distancia */}
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <div className="p-2 bg-blue-50 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">Tamaño de la zona</p>
                                <p className="text-sm font-semibold text-blue-700">
                                  {formatearArea(area)}
                                </p>
                              </div>
                              {distancia !== null ? (
                                <div className={`p-2 rounded-lg ${
                                  distancia === 0 
                                    ? 'bg-green-50' 
                                    : distancia < 100 
                                    ? 'bg-yellow-50' 
                                    : 'bg-orange-50'
                                }`}>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {distancia === 0 ? 'Dentro de la zona' : 'Distancia a la zona'}
                                  </p>
                                  <p className={`text-sm font-semibold ${
                                    distancia === 0 
                                      ? 'text-green-700' 
                                      : distancia < 100 
                                      ? 'text-yellow-700' 
                                      : 'text-orange-700'
                                  }`}>
                                    {distancia === 0 ? 'Estás dentro' : formatearDistancia(distancia)}
                                  </p>
                                </div>
                              ) : (
                                <div className="p-2 bg-gray-50 rounded-lg">
                                  <p className="text-xs text-muted-foreground mb-1">Distancia</p>
                                  <p className="text-sm font-semibold text-gray-600">
                                    Sin ubicación
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                              <span className="capitalize">Tipo: {zona.tipo}</span>
                              <span>
                                Desde: {new Date(asignacion.fecha_inicio).toLocaleDateString('es-AR')}
                              </span>
                              {asignacion.fecha_fin ? (
                                <span>
                                  Hasta: {new Date(asignacion.fecha_fin).toLocaleDateString('es-AR')}
                                </span>
                              ) : (
                                <span className="text-green-600 font-medium">Indefinido</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                asignacion.activo && zona.activo
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {asignacion.activo && zona.activo ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mapa */}
        {latitud && longitud && (
          <Card>
            <CardHeader>
              <CardTitle>Mi Ubicación Actual</CardTitle>
              <CardDescription>
                Tu ubicación se actualiza automáticamente cada 30 segundos
                {zonasAsignadas.length > 0 && ' - Las zonas asignadas se muestran en el mapa'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 rounded-lg overflow-hidden border">
                <MapContainer
                  center={[latitud, longitud]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapUpdater lat={latitud} lng={longitud} />
                  <Marker
                    position={[latitud, longitud]}
                    icon={L.divIcon({
                      className: 'custom-marker',
                      html: `
                        <div style="
                          background-color: #10b981;
                          width: 40px;
                          height: 40px;
                          border-radius: 50%;
                          border: 3px solid white;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          color: white;
                          font-weight: bold;
                          font-size: 16px;
                        ">
                          ${guardia.nombre.charAt(0)}
                        </div>
                      `,
                      iconSize: [40, 40],
                      iconAnchor: [20, 20],
                    })}
                  >
                  </Marker>
                  {/* Mostrar zonas asignadas en el mapa */}
                  {zonasAsignadas.map((asignacion) => {
                    const zona = asignacion.zona
                    if (!zona || !zona.activo || !asignacion.activo) return null
                    
                    try {
                      const coordenadas = JSON.parse(zona.coordenadas)
                      
                      if (zona.tipo === 'circulo') {
                        const { lat, lng, radio } = coordenadas
                        return (
                          <Circle
                            key={zona.id}
                            center={[lat, lng]}
                            radius={radio}
                            pathOptions={{
                              color: '#3b82f6',
                              fillColor: '#3b82f6',
                              fillOpacity: 0.2,
                              weight: 2,
                            }}
                          />
                        )
                      } else {
                        const puntos = Array.isArray(coordenadas)
                          ? coordenadas.map((p: { lat: number; lng: number }) => [p.lat, p.lng] as [number, number])
                          : []
                        
                        if (puntos.length < 3) return null

                        return (
                          <Polygon
                            key={zona.id}
                            positions={puntos}
                            pathOptions={{
                              color: '#3b82f6',
                              fillColor: '#3b82f6',
                              fillOpacity: 0.2,
                              weight: 2,
                            }}
                          />
                        )
                      }
                    } catch (error) {
                      console.error('Error al renderizar zona en mapa:', error)
                      return null
                    }
                  })}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Control de Asistencia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Control de Asistencia
            </CardTitle>
            <CardDescription>
              Registra tu entrada o salida con foto y geolocalización
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ultimaAsistencia && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Última asistencia:</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    ultimaAsistencia.tipo_asistencia === 'entrada'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {ultimaAsistencia.tipo_asistencia === 'entrada' ? 'Entrada' : 'Salida'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(ultimaAsistencia.created_at).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => registrarAsistencia('entrada')}
                disabled={!latitud || !longitud || registrandoAsistencia}
                className="h-20 text-lg"
                variant={ultimaAsistencia?.tipo_asistencia === 'entrada' ? 'default' : 'outline'}
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Entrada
              </Button>
              <Button
                onClick={() => registrarAsistencia('salida')}
                disabled={!latitud || !longitud || registrandoAsistencia}
                className="h-20 text-lg"
                variant={ultimaAsistencia?.tipo_asistencia === 'salida' ? 'default' : 'outline'}
              >
                <LogOut className="mr-2 h-5 w-5" />
                Salida
              </Button>
            </div>

            {(!latitud || !longitud) && (
              <p className="text-xs text-muted-foreground text-center">
                Esperando ubicación para registrar asistencia...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Documentos Pendientes de Firma - Solo se muestra si hay documentos */}
        {documentosPendientes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos Pendientes de Firma
              </CardTitle>
              <CardDescription>
                Tienes {documentosPendientes.length} documento{documentosPendientes.length > 1 ? 's' : ''} pendiente{documentosPendientes.length > 1 ? 's' : ''} de firma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cargandoDocumentos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {documentosPendientes.map((asignacion) => (
                    <Card key={asignacion.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div>
                              <h3 className="font-semibold">{asignacion.documento?.nombre}</h3>
                              <p className="text-sm text-muted-foreground">
                                Tipo: {asignacion.documento?.tipo} | Versión: {asignacion.documento?.version}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                Asignado el {new Date(asignacion.fecha_asignacion).toLocaleDateString('es-AR')}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleFirmarDocumento(asignacion)}
                              disabled={firmandoDocumento}
                            >
                              <FileSignature className="mr-2 h-4 w-4" />
                              Firmar
                            </Button>
                            {asignacion.documento?.archivo_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(asignacion.documento?.archivo_url, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Información del Guardia */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{guardia.email}</p>
            </div>
            {guardia.telefono && (
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{guardia.telefono}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  guardia.activo
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {guardia.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Dialog para captura de foto */}
        <Dialog 
          open={mostrarCamara} 
          onOpenChange={(open) => {
            setMostrarCamara(open)
            // Si se cierra el diálogo sin confirmar, limpiar estados
            if (!open && !fotoCapturada) {
              setTipoAsistencia(null)
              setFotoCapturada(null)
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Capturar Foto para {tipoAsistencia === 'entrada' ? 'Entrada' : 'Salida'}</DialogTitle>
              <DialogDescription>
                Toma una foto para registrar tu asistencia. La foto y tu ubicación serán guardadas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={confirmarAsistencia}
                  disabled={registrandoAsistencia}
                  className="flex-1"
                >
                  {registrandoAsistencia ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Confirmar y Registrar
                    </>
                  )}
                </Button>
                <Button
                  onClick={cancelarCamara}
                  variant="outline"
                  disabled={registrandoAsistencia}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-start gap-2">
                  <FileSignature className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Firma Documental:</p>
                    <p>Después de capturar la foto, deberás firmar el documento.</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para firma documental de asistencia */}
        <FirmaDialog
          open={mostrarFirma}
          onOpenChange={(open) => {
            setMostrarFirma(open)
            // Si se cierra el diálogo de firma sin completar, limpiar la foto
            if (!open && !firmaData) {
              setFotoCapturada(null)
            }
          }}
          onFirmaCompleta={handleFirmaCompleta}
          titulo={`Firma para ${tipoAsistencia === 'entrada' ? 'Entrada' : 'Salida'}`}
          descripcion="Firma el documento de asistencia usando el canvas o Clave Única"
        />

        {/* Dialog para firma de documento */}
        <FirmaDialog
          open={mostrarFirmaDocumento}
          onOpenChange={(open) => {
            setMostrarFirmaDocumento(open)
            if (!open) {
              setAsignacionDocumentoActual(null)
            }
          }}
          onFirmaCompleta={handleFirmaDocumentoCompleta}
          titulo={asignacionDocumentoActual ? `Firmar: ${asignacionDocumentoActual.documento?.nombre}` : 'Firmar Documento'}
          descripcion="Firma el documento usando el canvas o Clave Única"
        />
      </div>
    </div>
  )
}

