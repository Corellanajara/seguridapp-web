export interface FirmaData {
  tipo: 'manual' | 'clave_unica' | 'electronica'
  datos: string // JSON string o base64 según el tipo
  hash?: string
  timestamp: string
  valido: boolean
}

export const firmaService = {
  /**
   * Genera un hash de la firma para validación
   */
  generarHash(firmaData: string): string {
    // En producción, usar una función de hash real (SHA-256)
    // Por ahora, un hash simple para demostración
    let hash = 0
    for (let i = 0; i < firmaData.length; i++) {
      const char = firmaData.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convertir a 32bit integer
    }
    return Math.abs(hash).toString(16)
  },

  /**
   * Crea una firma manual desde canvas
   */
  crearFirmaManual(firmaBase64: string): FirmaData {
    const timestamp = new Date().toISOString()
    const hash = this.generarHash(firmaBase64 + timestamp)

    return {
      tipo: 'manual',
      datos: firmaBase64,
      hash,
      timestamp,
      valido: true,
    }
  },

  /**
   * Crea una firma electrónica (mock para Clave Única)
   */
  async crearFirmaElectronica(): Promise<FirmaData> {
    // Mock de integración con Clave Única
    // En producción, aquí se haría la integración real con la API de Clave Única
    const timestamp = new Date().toISOString()
    const datos = JSON.stringify({
      metodo: 'clave_unica',
      estado: 'pendiente_implementacion',
      timestamp,
      nota: 'Integración con Clave Única pendiente de implementación',
    })

    return {
      tipo: 'electronica',
      datos,
      hash: this.generarHash(datos),
      timestamp,
      valido: false, // No válido hasta implementar Clave Única
    }
  },

  /**
   * Valida una firma
   */
  validarFirma(firma: FirmaData): { valido: boolean; mensaje?: string } {
    if (!firma.hash) {
      return { valido: false, mensaje: 'Firma sin hash de validación' }
    }

    const hashCalculado = this.generarHash(firma.datos + firma.timestamp)
    if (hashCalculado !== firma.hash) {
      return { valido: false, mensaje: 'Hash de firma no coincide' }
    }

    if (firma.tipo === 'electronica' && !firma.valido) {
      return { valido: false, mensaje: 'Firma electrónica pendiente de implementación' }
    }

    return { valido: true }
  },

  /**
   * Almacena una firma de forma segura
   */
  async almacenarFirma(firma: FirmaData, _referencia: string): Promise<string> {
    // En producción, almacenar en un servicio seguro o encriptado
    // Por ahora, retornamos un identificador
    const firmaCompleta = JSON.stringify(firma)
    return btoa(firmaCompleta) // Base64 encoding simple
  },

  /**
   * Recupera una firma almacenada
   */
  async recuperarFirma(identificador: string): Promise<FirmaData | null> {
    try {
      const firmaCompleta = atob(identificador)
      return JSON.parse(firmaCompleta) as FirmaData
    } catch (error) {
      console.error('Error al recuperar firma:', error)
      return null
    }
  },
}
