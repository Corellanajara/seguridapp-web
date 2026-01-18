import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, Loader2 } from 'lucide-react'

interface CameraViewProps {
  url: string
  nombre: string
}

export default function CameraView({ url, nombre }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (videoRef.current && url) {
      videoRef.current.src = url
      videoRef.current.onloadeddata = () => setLoading(false)
      videoRef.current.onerror = () => {
        setError(true)
        setLoading(false)
      }
    }
  }, [url])

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{nombre}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-muted rounded">
            <p className="text-muted-foreground">Error al cargar la cámara</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          {nombre}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative bg-black rounded-lg overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 object-cover"
            controls
          />
        </div>
      </CardContent>
    </Card>
  )
}
