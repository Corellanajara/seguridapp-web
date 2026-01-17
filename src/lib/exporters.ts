export const exporters = {
  /**
   * Exporta datos a CSV
   */
  toCSV(data: any[], filename: string = 'export.csv'): void {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            return typeof value === 'string' && value.includes(',')
              ? `"${value}"`
              : value ?? ''
          })
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },

  /**
   * Exporta datos a Excel (formato CSV con extensión .xlsx)
   */
  toExcel(data: any[], filename: string = 'export.xlsx'): void {
    this.toCSV(data, filename.replace('.xlsx', '.csv'))
  },

  /**
   * Exporta datos a JSON
   */
  toJSON(data: any[], filename: string = 'export.json'): void {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },
}
