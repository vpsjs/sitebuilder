import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 管理员代客编辑：URL 带 ?token= 时，用该 token 作为本次编辑身份。
// 写入 localStorage 后立即从地址栏移除，避免 token 泄露或被书签保存。
try {
  const params = new URLSearchParams(location.search)
  const incoming = params.get('token')
  if (incoming) {
    localStorage.setItem('sb_token', incoming)
    if (params.get('imp') === '1') {
      localStorage.setItem('sb_impersonating', '1')
    }
    params.delete('token')
    params.delete('imp')
    const clean = `${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash}`
    history.replaceState({}, '', clean)
  }
} catch { /* 忽略 URL 处理异常 */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
