import React, { useRef, useEffect } from 'react'
import { Paperclip, Mic, Sparkles, ArrowRight } from 'lucide-react'

interface Citation {
  document: string
  page: number
  text?: string
  confidence?: number
}

interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  sources?: Citation[]
}

interface ChatWorkspaceProps {
  messages: Message[]
  query: string
  setQuery: (val: string) => void
  isLoading: boolean
  onSendQuery: () => void
  onOpenUploadModal: () => void
  onEnhancePrompt: () => void
  showToast: (msg: string) => void
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  query,
  setQuery,
  isLoading,
  onSendQuery,
  onOpenUploadModal,
  onEnhancePrompt,
  showToast
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSendQuery()
    }
  }

  return (
    <>
      <div className="main-content" style={{ display: 'block' }}>
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.sender}`}>
              <div className="message-avatar">
                {msg.sender === 'user' ? 'U' : 'AI'}
              </div>
              <div className="message-content">
                <span className="message-sender">
                  {msg.sender === 'user' ? 'You' : 'Lumina-4o'}
                </span>
                <div className="message-text">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message-bubble ai">
              <div className="message-avatar">AI</div>
              <div className="message-content">
                <span className="message-sender">Synthesizing Answer</span>
                <div className="message-text">
                  <div className="message-loading">
                    <span className="loading-dot"></span>
                    <span className="loading-dot"></span>
                    <span className="loading-dot"></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Bottom floating query capsule */}
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
            onClick={() => onSendQuery()}
            disabled={!query.trim() || isLoading}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </>
  )
}
