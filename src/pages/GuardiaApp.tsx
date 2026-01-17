import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ubicacionService } from '@/services/ubicacion'
import { asistenciasService } from '@/services/asistencias'
import { Guardia, Asistencia } from '@/types'
import { useGeolocation } from '@/hooks/useGeolocation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin, Navigation, LogOut, CheckCircle2, AlertCircle, Loader2, Camera, Clock, FileSignature, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import FirmaDialog from '@/components/FirmaDialog'
import { firmaService, FirmaData } from '@/services/firma'

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
    map.setView([lat, lng], 16)
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
  const intervaloRef = useRef<NodeJS.Timeout | null>(null)
  
  // Estados para control de asistencia
  const [mostrarCamara, setMostrarCamara] = useState(false)
  const [mostrarFirma, setMostrarFirma] = useState(false)
  const [firmaData, setFirmaData] = useState<FirmaData | null>(null)
  const [tipoAsistencia, setTipoAsistencia] = useState<'entrada' | 'salida' | null>(null)
  const [registrandoAsistencia, setRegistrandoAsistencia] = useState(false)
  const [ultimaAsistencia, setUltimaAsistencia] = useState<Asistencia | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const { latitud, longitud, error: geoError, loading: geoLoading } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0, // Siempre obtener ubicación fresca
  })

  useEffect(() => {
    cargarPerfil()
    cargarUltimaAsistencia()
  }, [])

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

  const actualizarUbicacion = async () => {
    if (!latitud || !longitud || actualizando) return

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
    // Continuar con el registro de asistencia
    procesarAsistenciaConFirma()
  }

  const procesarAsistenciaConFirma = async () => {
    if (!tipoAsistencia || !latitud || !longitud || !firmaData) {
      toast({
        title: 'Error',
        description: 'Faltan datos para registrar la asistencia',
        variant: 'destructive',
      })
      return
    }

    setRegistrandoAsistencia(true)

    try {
      // Capturar foto
      const fotoBase64 = await capturarFoto()
      
      // Subir foto
      const fotoUrl = await subirFoto(fotoBase64)

      // Validar firma
      const validacion = firmaService.validarFirma(firmaData)
      if (!validacion.valido) {
        toast({
          title: 'Advertencia',
          description: validacion.mensaje || 'La firma no es válida',
          variant: 'destructive',
        })
      }

      // Almacenar firma
      const firmaAlmacenada = await firmaService.almacenarFirma(firmaData, `asistencia_${tipoAsistencia}_${Date.now()}`)
      const firmaDocumental = JSON.stringify(firmaData)

      // Registrar asistencia
      const asistencia = await asistenciasService.crearAsistencia({
        tipo_asistencia: tipoAsistencia,
        foto_url: fotoUrl,
        latitud,
        longitud,
        firma_documental: firmaDocumental,
        firma_clave_unica: firmaData.tipo === 'electronica' || firmaData.tipo === 'clave_unica',
        observaciones: `Registro de ${tipoAsistencia} georeferenciado con firma ${firmaData.tipo}`,
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
      detenerCamara()
    } catch (error: any) {
      toast({
        title: 'Error al registrar asistencia',
        description: error.message || 'No se pudo registrar la asistencia',
        variant: 'destructive',
      })
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

    // Cerrar cámara y mostrar diálogo de firma
    detenerCamara()
    setMostrarCamara(false)
    setMostrarFirma(true)
  }

  const cancelarCamara = () => {
    detenerCamara()
    setMostrarCamara(false)
    setTipoAsistencia(null)
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

            <Button
              onClick={actualizarUbicacion}
              disabled={!latitud || !longitud || actualizando || !!geoError}
              className="w-full"
            >
              <MapPin className="mr-2 h-4 w-4" />
              {actualizando ? 'Actualizando...' : 'Actualizar Ubicación Ahora'}
            </Button>
          </CardContent>
        </Card>

        {/* Mapa */}
        {latitud && longitud && (
          <Card>
            <CardHeader>
              <CardTitle>Mi Ubicación Actual</CardTitle>
              <CardDescription>
                Tu ubicación se actualiza automáticamente cada 30 segundos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 rounded-lg overflow-hidden border">
                <MapContainer
                  center={[latitud, longitud]}
                  zoom={16}
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
        <Dialog open={mostrarCamara} onOpenChange={setMostrarCamara}>
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

        {/* Dialog para firma documental */}
        <FirmaDialog
          open={mostrarFirma}
          onOpenChange={setMostrarFirma}
          onFirmaCompleta={handleFirmaCompleta}
          titulo={`Firma para ${tipoAsistencia === 'entrada' ? 'Entrada' : 'Salida'}`}
          descripcion="Firma el documento de asistencia usando el canvas o Clave Única"
        />
      </div>
    </div>
  )
}

