import React, { useRef, useEffect } from 'react'

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

interface ChatMessagesProps {
  messages: Message[]
  isLoading: boolean
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading }) => {
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
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
  )
}
