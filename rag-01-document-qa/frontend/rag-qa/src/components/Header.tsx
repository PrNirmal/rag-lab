import React from 'react'
import { Sparkles } from 'lucide-react'
import logoImg from '../assets/logo.png'

interface HeaderProps {
  modelProvider: 'ollama' | 'openrouter'
  onChangeModelProvider: (val: 'ollama' | 'openrouter') => void
}

export const Header: React.FC<HeaderProps> = ({ modelProvider, onChangeModelProvider }) => {
  return (
    <header className="header">
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src={logoImg} alt="RAG QA Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
        <span className="studio-title">RAG Studio</span>
        <span className="studio-divider">|</span>
        <div className="model-selector">
          <Sparkles size={14} className="sparkle-icon" />
          <select
            value={modelProvider}
            onChange={(e) => onChangeModelProvider(e.target.value as 'ollama' | 'openrouter')}
          >
            <option value="ollama">Lumina-4o Premium (Ollama)</option>
            <option value="openrouter">Lumina-4o Cloud (OpenRouter)</option>
          </select>
        </div>
      </div>
    </header>
  )
}
