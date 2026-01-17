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
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modo, setModo] = useState<'manual' | 'clave_unica'>('manual')

  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
  }, [open])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

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
              <div className="border-2 border-dashed rounded-lg p-4 bg-muted/50">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  className="w-full h-48 cursor-crosshair touch-none border rounded bg-white"
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
