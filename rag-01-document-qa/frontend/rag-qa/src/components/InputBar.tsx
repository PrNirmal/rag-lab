import React from 'react'
import { Paperclip, Mic, Sparkles, ArrowRight } from 'lucide-react'

interface InputBarProps {
  query: string
  setQuery: (val: string) => void
  isLoading: boolean
  onSendQuery: () => void
  onOpenUploadModal: () => void
  onEnhancePrompt: () => void
  showToast: (msg: string) => void
}

export const InputBar: React.FC<InputBarProps> = ({
  query,
  setQuery,
  isLoading,
  onSendQuery,
  onOpenUploadModal,
  onEnhancePrompt,
  showToast
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSendQuery()
    }
  }

  return (
    <div className="input-container">
      <div className="input-capsule">
        <div className="attachment-pill" onClick={onOpenUploadModal}>
          <Paperclip size={14} />
        </div>
        <button className="mic-btn" onClick={() => showToast('Voice typing is a placeholder in this demo.')}>
          <Mic size={14} />
        </button>
        <input
          type="text"
          className="query-input"
          placeholder="Ask about your documents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="enhance-badge" onClick={onEnhancePrompt}>
          <Sparkles size={11} />
          <span>AI Enhance</span>
        </button>
        <span className="shortcut-hint">Press ⌘ + Enter</span>
        <button
          className="send-btn"
          onClick={onSendQuery}
          disabled={!query.trim() || isLoading}
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
