import { supabase } from '@/lib/supabase'

export interface BiometricaData {
  foto: string // Base64
  guardia_id: string
  tipo: 'facial' | 'huella'
  confianza?: number
}

export const biometricaService = {
  /**
   * Compara una foto con la foto de perfil del guardia
   */
  async validarBiometrica(data: BiometricaData): Promise<{ valido: boolean; confianza: number }> {
    // En producción, aquí se integraría con un servicio de reconocimiento facial
    // Por ahora, retornamos una validación básica
    
    // Obtener foto de perfil del guardia
    const { data: guardia } = await supabase
      .from('guardias')
      .select('foto_url')
      .eq('id', data.guardia_id)
      .single()

    if (!guardia?.foto_url) {
      return { valido: false, confianza: 0 }
    }

    // Mock: En producción, aquí se haría la comparación real
    // Por ahora, retornamos una validación mock
    const confianza = Math.random() * 0.3 + 0.7 // Mock: 70-100%
    
    return {
      valido: confianza > 0.8,
      confianza,
    }
  },

  /**
   * Captura foto para validación biométrica
   */
  async capturarFoto(): Promise<string> {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user' } })
        .then((stream) => {
          const video = document.createElement('video')
          video.srcObject = stream
          video.play()

          video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(video, 0, 0)
              stream.getTracks().forEach((track) => track.stop())
              resolve(canvas.toDataURL('image/jpeg', 0.8))
            } else {
              reject(new Error('No se pudo obtener el contexto del canvas'))
            }
          }
        })
        .catch(reject)
    })
  },
}
