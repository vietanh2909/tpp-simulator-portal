import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import 'material-symbols/outlined.css'
import './styles/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'

const container = document.getElementById('root')
if (!container) throw new Error('Không tìm thấy phần tử #root')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
