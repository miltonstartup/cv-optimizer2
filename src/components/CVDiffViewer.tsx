import { useState } from 'react'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'
import { ChevronDown, ChevronRight, Download, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import { saveAs } from 'file-saver'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import jsPDF from 'jspdf'
import toast from 'react-hot-toast'

interface CVDiffViewerProps {
  originalCV: string
  optimizedCV: string
  recommendations?: {
    resumen_profesional_sugerido?: string
    experiencia_laboral_mejorada?: Array<{
      empresa: string
      puesto: string
      descripcion_mejorada: string
    }>
    habilidades_a_destacar?: string[]
    secciones_a_reorganizar?: string[]
    palabras_clave_a_incluir?: string[]
  }
}

export function CVDiffViewer({ originalCV, optimizedCV, recommendations }: CVDiffViewerProps) {
  const [showRecommendations, setShowRecommendations] = useState(true)
  const [diffMethod, setDiffMethod] = useState<DiffMethod>(DiffMethod.WORDS)
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | 'txt' | null>(null)
  const [downloadComplete, setDownloadComplete] = useState<'pdf' | 'docx' | 'txt' | null>(null)

  const customStyles = {
    variables: {
      light: {
        codeFoldGutterBackground: '#f8f9fa',
        codeFoldBackground: '#f8f9fa',
      },
    },
  }

  async function exportToPDF() {
    setDownloading('pdf')
    setDownloadComplete(null)
    
    try {
      const pdf = new jsPDF()
      
      // Configurar fuente y colores
      pdf.setFont('helvetica')
      
      // Header
      pdf.setFontSize(24)
      pdf.setTextColor(37, 99, 235) // Blue-600
      pdf.text('CV Optimizado', 20, 25)
      
      // Línea divisoria
      pdf.setDrawColor(229, 231, 235) // Gray-200
      pdf.setLineWidth(0.5)
      pdf.line(20, 35, 190, 35)
      
      let yPosition = 50
      
      // Fecha de generación
      pdf.setFontSize(10)
      pdf.setTextColor(107, 114, 128) // Gray-500
      pdf.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 20, yPosition)
      yPosition += 15
      
      // Recomendaciones si existen
      if (recommendations) {
        pdf.setFontSize(16)
        pdf.setTextColor(16, 185, 129) // Emerald-500
        pdf.text('Recomendaciones Aplicadas', 20, yPosition)
        yPosition += 10
        
        pdf.setFontSize(10)
        pdf.setTextColor(75, 85, 99) // Gray-600
        
        if (recommendations.habilidades_a_destacar?.length) {
          pdf.text('• Habilidades destacadas: ' + recommendations.habilidades_a_destacar.join(', '), 20, yPosition)
          yPosition += 8
        }
        
        if (recommendations.palabras_clave_a_incluir?.length) {
          pdf.text('• Palabras clave optimizadas incluidas', 20, yPosition)
          yPosition += 8
        }
        
        yPosition += 10
      }
      
      // Contenido del CV
      pdf.setFontSize(14)
      pdf.setTextColor(55, 65, 81) // Gray-700
      pdf.text('Contenido del CV:', 20, yPosition)
      yPosition += 10
      
      // Procesar el contenido línea por línea
      pdf.setFontSize(10)
      pdf.setTextColor(17, 24, 39) // Gray-900
      
      const lines = optimizedCV.split('\n')
      const pageHeight = pdf.internal.pageSize.height
      const maxWidth = 170
      
      for (const line of lines) {
        if (line.trim()) {
          const wrappedLines = pdf.splitTextToSize(line, maxWidth)
          
          for (const wrappedLine of wrappedLines) {
            if (yPosition > pageHeight - 20) {
              pdf.addPage()
              yPosition = 20
            }
            
            pdf.text(wrappedLine, 20, yPosition)
            yPosition += 6
          }
        } else {
          yPosition += 4 // Espacio para líneas vacías
        }
      }
      
      // Footer en la última página
      const pageCount = (pdf as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(156, 163, 175) // Gray-400
        pdf.text(`Página ${i} de ${pageCount}`, 170, pageHeight - 10)
      }
      
      pdf.save('cv-optimizado.pdf')
      
      // Mostrar estado de éxito
      setDownloadComplete('pdf')
      toast.success('PDF descargado exitosamente')
      setTimeout(() => setDownloadComplete(null), 3000)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Error al generar el PDF')
    } finally {
      setDownloading(null)
    }
  }

  async function exportToDocx() {
    setDownloading('docx')
    setDownloadComplete(null)
    
    try {
      const children = [
        // Título principal
        new Paragraph({
          children: [
            new TextRun({
              text: 'CV Optimizado',
              bold: true,
              size: 32,
              color: '2563EB', // Blue-600
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        
        // Fecha de generación
        new Paragraph({
          children: [
            new TextRun({
              text: `Generado el: ${new Date().toLocaleDateString('es-ES')}`,
              size: 20,
              color: '6B7280', // Gray-500
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        
        new Paragraph({ text: '' }), // Espacio
      ]
      
      // Agregar recomendaciones si existen
      if (recommendations) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Recomendaciones Aplicadas',
                bold: true,
                size: 24,
                color: '059669', // Emerald-600
              }),
            ],
            heading: HeadingLevel.HEADING_2,
          })
        )
        
        if (recommendations.habilidades_a_destacar?.length) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '• Habilidades destacadas: ' + recommendations.habilidades_a_destacar.join(', '),
                  size: 22,
                }),
              ],
            })
          )
        }
        
        if (recommendations.palabras_clave_a_incluir?.length) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '• Palabras clave optimizadas incluidas: ' + recommendations.palabras_clave_a_incluir.join(', '),
                  size: 22,
                }),
              ],
            })
          )
        }
        
        children.push(new Paragraph({ text: '' })) // Espacio
      }
      
      // Agregar título del contenido
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Contenido del CV',
              bold: true,
              size: 24,
              color: '374151', // Gray-700
            }),
          ],
          heading: HeadingLevel.HEADING_2,
        })
      )
      
      // Procesar el contenido del CV línea por línea
      const lines = optimizedCV.split('\n')
      for (const line of lines) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line || ' ', // Usar espacio para líneas vacías
                size: 22,
                color: '111827', // Gray-900
              }),
            ],
          })
        )
      }
      
      const doc = new Document({
        sections: [{
          properties: {},
          children,
        }],
      })

      const blob = await Packer.toBlob(doc)
      saveAs(blob, 'cv-optimizado.docx')
      
      // Mostrar estado de éxito
      setDownloadComplete('docx')
      toast.success('Documento Word descargado exitosamente')
      setTimeout(() => setDownloadComplete(null), 3000)
      
    } catch (error) {
      console.error('Error generating DOCX:', error)
      toast.error('Error al generar el documento Word')
    } finally {
      setDownloading(null)
    }
  }

  function exportToTxt() {
    setDownloading('txt')
    setDownloadComplete(null)
    
    try {
      // Crear contenido más completo para el archivo de texto
      let content = 'CV OPTIMIZADO\n'
      content += '='.repeat(50) + '\n\n'
      content += `Generado el: ${new Date().toLocaleDateString('es-ES')}\n\n`
      
      // Agregar recomendaciones si existen
      if (recommendations) {
        content += 'RECOMENDACIONES APLICADAS:\n'
        content += '-'.repeat(30) + '\n'
        
        if (recommendations.habilidades_a_destacar?.length) {
          content += '• Habilidades destacadas: ' + recommendations.habilidades_a_destacar.join(', ') + '\n'
        }
        
        if (recommendations.palabras_clave_a_incluir?.length) {
          content += '• Palabras clave optimizadas incluidas: ' + recommendations.palabras_clave_a_incluir.join(', ') + '\n'
        }
        
        content += '\n'
      }
      
      content += 'CONTENIDO DEL CV:\n'
      content += '-'.repeat(20) + '\n\n'
      content += optimizedCV
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      saveAs(blob, 'cv-optimizado.txt')
      
      // Mostrar estado de éxito
      setDownloadComplete('txt')
      toast.success('Archivo de texto descargado exitosamente')
      setTimeout(() => setDownloadComplete(null), 3000)
      
    } catch (error) {
      console.error('Error generating TXT:', error)
      toast.error('Error al generar el archivo de texto')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">Comparación Original vs Optimizado</h3>
            <select
              value={diffMethod}
              onChange={(e) => setDiffMethod(e.target.value as DiffMethod)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={DiffMethod.WORDS}>Por palabras</option>
              <option value={DiffMethod.LINES}>Por líneas</option>
              <option value={DiffMethod.CHARS}>Por caracteres</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={exportToTxt}
              disabled={downloading === 'txt'}
              className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:bg-gray-300 text-gray-700 rounded-md transition-colors relative"
            >
              {downloading === 'txt' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : downloadComplete === 'txt' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span>{downloading === 'txt' ? 'Generando...' : 'TXT'}</span>
            </button>
            <button
              onClick={exportToDocx}
              disabled={downloading === 'docx'}
              className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 disabled:bg-blue-300 text-blue-700 rounded-md transition-colors"
            >
              {downloading === 'docx' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : downloadComplete === 'docx' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{downloading === 'docx' ? 'Generando...' : 'DOCX'}</span>
            </button>
            <button
              onClick={exportToPDF}
              disabled={downloading === 'pdf'}
              className="flex items-center space-x-1 px-3 py-2 text-sm bg-red-100 hover:bg-red-200 disabled:bg-red-300 text-red-700 rounded-md transition-colors"
            >
              {downloading === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : downloadComplete === 'pdf' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{downloading === 'pdf' ? 'Generando...' : 'PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      {recommendations && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => setShowRecommendations(!showRecommendations)}
          >
            <h3 className="text-lg font-semibold text-gray-900">Recomendaciones de Mejora</h3>
            {showRecommendations ? (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            )}
          </div>
          
          {showRecommendations && (
            <div className="px-4 pb-4 space-y-4">
              {recommendations.resumen_profesional_sugerido && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Resumen Profesional Sugerido</h4>
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-800">{recommendations.resumen_profesional_sugerido}</p>
                  </div>
                </div>
              )}
              
              {recommendations.habilidades_a_destacar && recommendations.habilidades_a_destacar.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Habilidades a Destacar</h4>
                  <div className="flex flex-wrap gap-2">
                    {recommendations.habilidades_a_destacar.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {recommendations.palabras_clave_a_incluir && recommendations.palabras_clave_a_incluir.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Palabras Clave a Incluir</h4>
                  <div className="flex flex-wrap gap-2">
                    {recommendations.palabras_clave_a_incluir.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {recommendations.secciones_a_reorganizar && recommendations.secciones_a_reorganizar.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Secciones a Reorganizar</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {recommendations.secciones_a_reorganizar.map((section, index) => (
                      <li key={index}>{section}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Comparación diff */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <ReactDiffViewer
          oldValue={originalCV}
          newValue={optimizedCV}
          splitView={true}
          compareMethod={diffMethod}
          leftTitle="CV Original"
          rightTitle="CV Optimizado"
          styles={customStyles}
          hideLineNumbers={false}
          showDiffOnly={false}
        />
      </div>
    </div>
  )
}