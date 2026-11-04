import { useState } from 'react'

import { Badge, Field, Section } from './shared'

export function AssistantPage() {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(false)
  const [fileName, setFileName] = useState('')
  return (
    <div className="rr-stack">
      <div className="rr-heading">
        <div>
          <span className="rr-eyebrow">ASISTENCIA AL TALLER</span>
          <h1>Asistente con IA</h1>
          <p>Una muestra de cómo podría agilizar el trabajo repetitivo.</p>
        </div>
        <Badge tone="amber">Simulación</Badge>
      </div>
      <div className="rr-notice">
        <strong>Sin conexión a IA.</strong> Esta pantalla no graba audio, no procesa documentos ni
        modifica datos. Los resultados son ejemplos ficticios para explicar el flujo.
      </div>
      <div className="rr-two-col">
        <Section
          title="De una nota a un presupuesto"
          subtitle="Ejemplo de una futura captura por voz, con revisión antes de guardar."
        >
          <div className="rr-stack">
            <Field label="Escribe una nota de ejemplo">
              <textarea
                value={text}
                onChange={(event) => {
                  setText(event.target.value)
                  setPreview(false)
                }}
                placeholder="Ej.: revisar frenos y preparar el coche para rally"
                rows={4}
              />
            </Field>
            <button className="rr-button" disabled={!text.trim()} onClick={() => setPreview(true)}>
              Mostrar ejemplo de propuesta
            </button>
            {preview && (
              <div className="rr-example">
                <strong>Ejemplo fijo · no generado desde tu nota</strong>
                <p>Revisión del sistema de frenos · 2 h de mano de obra</p>
                <p>Kit de frenos · 1 unidad · proveedor por confirmar</p>
                <small>
                  Una persona revisaría el vehículo, las piezas y los precios antes de crear el
                  presupuesto o parte.
                </small>
              </div>
            )}
          </div>
        </Section>
        <Section
          title="Lectura de albaranes y facturas"
          subtitle="Ejemplo de revisión de un documento de proveedor."
        >
          <div className="rr-stack">
            <Field label="Seleccionar PDF de ejemplo">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
              />
            </Field>
            {fileName && (
              <div className="rr-example">
                <strong>Ejemplo fijo · {fileName}</strong>
                <p>Pedido: 2 kits de frenos · recepción de ejemplo: 1</p>
                <p>La diferencia se mostraría para revisión antes de actualizar el stock.</p>
                <small>
                  El archivo no se lee ni se sube. Para probar la recepción manual, utiliza Compras.
                </small>
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  )
}
