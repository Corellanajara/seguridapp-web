import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { biometricaService } from '@/services/biometrica'

interface BiometricCaptureProps {
  guardiaId: string
  onValidacion: (valido: boolean, confianza: number) => void
}

export default function BiometricCapture({ guardiaId, onValidacion }: BiometricCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [capturando, setCapturando] = useState(false)
  const [validando, setValidando] = useState(false)
  const [resultado, setResultado] = useState<{ valido: boolean; confianza: number } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    iniciarCamara()
    return () => detenerCamara()
  }, [])

  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error al acceder a la cámara:', error)
    }
  }

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const capturarYValidar = async () => {
    if (!videoRef.current) return

    setCapturando(true)
    try {
      const foto = await biometricaService.capturarFoto()
      setValidando(true)
      
      const resultado = await biometricaService.validarBiometrica({
        foto,
        guardia_id: guardiaId,
        tipo: 'facial',
      })

      setResultado(resultado)
      onValidacion(resultado.valido, resultado.confianza)
    } catch (error) {
      console.error('Error en validación biométrica:', error)
    } finally {
      setCapturando(false)
      setValidando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-64 object-cover"
        />
      </div>

      {resultado && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          resultado.valido ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {resultado.valido ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <div>
            <p className="font-medium">
              {resultado.valido ? 'Validación exitosa' : 'Validación fallida'}
            </p>
            <p className="text-sm">
              Confianza: {(resultado.confianza * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      <Button
        onClick={capturarYValidar}
        disabled={capturando || validando}
        className="w-full"
      >
        {capturando || validando ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {validando ? 'Validando...' : 'Capturando...'}
          </>
        ) : (
          <>
            <Camera className="mr-2 h-4 w-4" />
            Capturar y Validar
          </>
        )}
      </Button>
    </div>
  )
}
