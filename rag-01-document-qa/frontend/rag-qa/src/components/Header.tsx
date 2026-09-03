import React from 'react'
import { Sparkles, PanelRight } from 'lucide-react'
import logoImg from '../assets/logo.png'

interface HeaderProps {
  modelProvider: 'ollama' | 'openrouter'
  onChangeModelProvider: (val: 'ollama' | 'openrouter') => void
  onToggleSidebar: () => void
  documentCount?: number
  isSidebarOpen?: boolean
}

export const Header: React.FC<HeaderProps> = ({
  modelProvider,
  onChangeModelProvider,
  onToggleSidebar,
  documentCount = 0,
  isSidebarOpen = false,
}) => {
  return (
    <header className="header">
      <div className="header-left">
        <div className="header-brand">
          <img src={logoImg} alt="RAG QA Logo" className="header-logo" style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} />
          <span className="studio-title">RAG Studio</span>
        </div>

        <span className="studio-divider">|</span>
        <div className="model-selector">
          <Sparkles size={14} className="sparkle-icon" />
          <select
            value={modelProvider}
            onChange={(e) => onChangeModelProvider(e.target.value as 'ollama' | 'openrouter')}
          >
            <option value="openrouter">Lumina-4o Cloud (OpenRouter)</option>
            <option value="ollama">Lumina-4o Premium (Ollama)</option>

          </select>
        </div>
      </div>

      <div className="header-right">
        <button
          className={`sidebar-toggle-btn ${isSidebarOpen ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title="Toggle Document Library"
          aria-label="Toggle Document Library"
        >
          <PanelRight size={18} className="toggle-icon" />
          {documentCount > 0 && (
            <span className="sidebar-badge-count">{documentCount}</span>
          )}
        </button>
      </div>
    </header>
  )
}


