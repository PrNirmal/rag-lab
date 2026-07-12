import React from 'react'
import { Check, AlertCircle } from 'lucide-react'

interface ToastProps {
  message: string | null
  type: 'info' | 'success' | 'error'
}

export const Toast: React.FC<ToastProps> = ({ message, type }) => {
  if (!message) return null

  return (
    <div className="toast">
      {type === 'success' && <Check size={14} style={{ color: '#10b981' }} />}
      {type === 'error' && <AlertCircle size={14} style={{ color: '#ef4444' }} />}
      <span>{message}</span>
    </div>
  )
}
