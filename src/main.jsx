import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './style.css'

try {
  const raw = localStorage.getItem('work-timer:v1')
  const theme = raw ? JSON.parse(raw).theme : 'light'
  document.documentElement.setAttribute(
    'data-theme',
    theme === 'dark' ? 'dark' : 'light',
  )
} catch {
  document.documentElement.setAttribute('data-theme', 'light')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
