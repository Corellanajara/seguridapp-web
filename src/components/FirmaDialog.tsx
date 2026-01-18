import { useRef, useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, X, FileSignature } from 'lucide-react'
import { firmaService, FirmaData } from '@/services/firma'

interface FirmaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFirmaCompleta: (firma: FirmaData) => void
  titulo?: string
  descripcion?: string
}

export default function FirmaDialog({
  open,
  onOpenChange,
  onFirmaCompleta,
  titulo = 'Firma Documental',
  descripcion = 'Firma el documento usando el canvas o Clave Única',
}: FirmaDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modo, setModo] = useState<'manual' | 'clave_unica'>('manual')

  // Inicializar y ajustar el canvas
  useEffect(() => {
    if (open && canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current
      const container = containerRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx) return

      // Función para ajustar el canvas
      const resizeCanvas = () => {
        // Esperar un frame para que el DOM se actualice
        requestAnimationFrame(() => {
          // Obtener el tamaño del contenedor
          const rect = container.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) return
          
          const dpr = window.devicePixelRatio || 1
          const width = rect.width - 32 // Restar padding (16px * 2)
          const height = Math.max(150, width * 0.5) // Mínimo 150px de altura, proporción 2:1
          
          // Guardar el tamaño visual para cálculos de coordenadas
          const visualWidth = width
          const visualHeight = height
          
          // Establecer el tamaño real del canvas (considerando DPR para pantallas retina)
          canvas.width = visualWidth * dpr
          canvas.height = visualHeight * dpr
          
          // Establecer el tamaño visual del canvas
          canvas.style.width = `${visualWidth}px`
          canvas.style.height = `${visualHeight}px`

          // Reiniciar el contexto y escalar para pantallas retina
          ctx.setTransform(1, 0, 0, 1, 0, 0) // Resetear transformación
          ctx.scale(dpr, dpr)
          
          // Configurar el estilo de dibujo
          ctx.strokeStyle = '#000'
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
        })
      }

      // Inicializar después de un pequeño delay para asegurar que el diálogo esté renderizado
      const timeoutId = setTimeout(resizeCanvas, 100)
      
      // Ajustar cuando cambia el tamaño de la ventana
      window.addEventListener('resize', resizeCanvas)
      
      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('resize', resizeCanvas)
      }
    }
  }, [open])

  // Limpiar canvas cuando se cierra el diálogo
  useEffect(() => {
    if (!open && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setHasSignature(false)
      }
    }
  }, [open])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    let clientX: number
    let clientY: number
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    
    // Calcular coordenadas relativas al canvas (ya escalado por el contexto)
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    return { x, y }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const limpiarFirma = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleFirmaClaveUnica = async () => {
    setGuardando(true)
    try {
      const firma = await firmaService.crearFirmaElectronica()
      onFirmaCompleta(firma)
      onOpenChange(false)
    } catch (error) {
      console.error('Error al crear firma electrónica:', error)
    } finally {
      setGuardando(false)
    }
  }

  const handleConfirmar = () => {
    if (!canvasRef.current || !hasSignature) return

    setGuardando(true)
    try {
      const canvas = canvasRef.current
      const firmaBase64 = canvas.toDataURL('image/png')
      const firma = firmaService.crearFirmaManual(firmaBase64)
      onFirmaCompleta(firma)
      onOpenChange(false)
    } catch (error) {
      console.error('Error al crear firma:', error)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            {titulo}
          </DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={modo === 'manual' ? 'default' : 'outline'}
              onClick={() => setModo('manual')}
              className="flex-1"
            >
              Firma Manual
            </Button>
            <Button
              type="button"
              variant={modo === 'clave_unica' ? 'default' : 'outline'}
              onClick={() => setModo('clave_unica')}
              className="flex-1"
              disabled
            >
              Clave Única (Próximamente)
            </Button>
          </div>

          {modo === 'manual' && (
            <div className="space-y-2">
              <div 
                ref={containerRef}
                className="border-2 border-dashed rounded-lg p-4 bg-muted/50"
              >
                <canvas
                  ref={canvasRef}
                  className="w-full cursor-crosshair touch-none border rounded bg-white"
                  style={{ aspectRatio: '2/1', maxHeight: '300px' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={limpiarFirma}
                  disabled={!hasSignature || guardando}
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpiar
                </Button>
              </div>
            </div>
          )}

          {modo === 'clave_unica' && (
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-4">
                La integración con Clave Única está pendiente de implementación.
              </p>
              <Button
                type="button"
                onClick={handleFirmaClaveUnica}
                disabled={guardando}
                variant="outline"
              >
                {guardando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Generar Mock de Firma'
                )}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={guardando}
          >
            Cancelar
          </Button>
          {modo === 'manual' && (
            <Button
              type="button"
              onClick={handleConfirmar}
              disabled={!hasSignature || guardando}
            >
              {guardando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Confirmar Firma'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
