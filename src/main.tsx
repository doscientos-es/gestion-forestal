import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { RacingApp } from '@/features/racing/ui/app'

import './racing.css'

const rootElement = document.getElementById('root')

if (!rootElement) throw new Error('No se ha encontrado el elemento raíz de la aplicación.')

createRoot(rootElement).render(
  <StrictMode>
    <RacingApp />
  </StrictMode>,
)
