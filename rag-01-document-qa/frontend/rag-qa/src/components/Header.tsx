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
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="header-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={logoImg} alt="RAG QA Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
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

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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


