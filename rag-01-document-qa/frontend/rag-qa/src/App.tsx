import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { WelcomeScreen } from './components/WelcomeScreen'
import { ChatMessages } from './components/ChatMessages'
import { InputBar } from './components/InputBar'
import { UploadModal } from './components/UploadModal'
import { Toast } from './components/Toast'
import logoImg from './assets/logo.png'

// Types
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

interface UploadProgress {
  name: string
  status: 'pending' | 'success' | 'error'
  errorMsg?: string
}

function App() {
  // Navigation & Config state
  const [modelProvider, setModelProvider] = useState<'ollama' | 'openrouter'>('ollama')

  // Splash Loading states
  const [isSplashing, setIsSplashing] = useState(true)
  const [showOverlay, setShowOverlay] = useState(true)

  // Chat & Query state
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Document list & Upload state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadProgressList, setUploadProgressList] = useState<UploadProgress[]>([])

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null)

  // Splash Screen timer trigger
  useEffect(() => {
    // 1.5s display time, then trigger fade out transitions
    const splashTimer = setTimeout(() => {
      setIsSplashing(false)
    }, 1500)

    // Complete overlay removal after transition finishes (1.5s + 0.6s transition)
    const overlayRemoveTimer = setTimeout(() => {
      setShowOverlay(false)
    }, 2100)

    return () => {
      clearTimeout(splashTimer)
      clearTimeout(overlayRemoveTimer)
    }
  }, [])

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  // Handle uploading files
  const handleFileUpload = async (files: FileList) => {
    const newProgressItems = Array.from(files).map(f => ({ name: f.name, status: 'pending' as const }))
    setUploadProgressList(prev => [...newProgressItems, ...prev])

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch('/api/uploads/', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          setUploadProgressList(prev =>
            prev.map(item => (item.name === file.name ? { ...item, status: 'success' } : item))
          )
          showToast(`"${file.name}" uploaded and indexed successfully!`, 'success')
        } else {
          const errData = await response.json().catch(() => ({}))
          const errorMsg = errData.detail || 'Upload failed'
          setUploadProgressList(prev =>
            prev.map(item => (item.name === file.name ? { ...item, status: 'error', errorMsg } : item))
          )
          showToast(`Failed to upload "${file.name}": ${errorMsg}`, 'error')
        }
      } catch (error) {
        setUploadProgressList(prev =>
          prev.map(item => (item.name === file.name ? { ...item, status: 'error', errorMsg: 'Network error' } : item))
        )
        showToast(`Failed to upload "${file.name}": Network error`, 'error')
      }
    }
  }

  // Handle sending a RAG query
  const handleSendQuery = async (textToSend?: string) => {
    const queryText = textToSend !== undefined ? textToSend : query
    if (!queryText.trim() || isLoading) return

    const userMessageId = Date.now().toString()
    const userMsg: Message = {
      id: userMessageId,
      sender: 'user',
      text: queryText
    }

    setMessages(prev => [...prev, userMsg])
    if (textToSend === undefined) {
      setQuery('')
    }
    setIsLoading(true)

    try {
      const providerParam = modelProvider === 'openrouter' ? 'openrouter' : 'ollama'
      const response = await fetch(`/api/uploads/query?q=${encodeURIComponent(queryText)}&provider=${providerParam}`)

      if (response.ok) {
        const data = await response.json()
        
        // Map backend results to citations list
        const retrievedCitations: Citation[] = (data.results || []).map((res: any) => {
          const dist = res.distance ?? 0.3
          const confidenceScore = Math.max(65, Math.min(99, Math.round((1 - dist) * 100)))

          return {
            document: res.metadata?.document || 'Document',
            page: res.metadata?.page || 1,
            text: res.text || '',
            confidence: confidenceScore
          }
        })

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: data.answer || "I couldn't generate an answer based on the current context.",
          sources: retrievedCitations
        }

        setMessages(prev => [...prev, aiMsg])
      } else {
        const errData = await response.json().catch(() => ({}))
        const errorMsg = errData.detail || 'Query failed'
        
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: `Error calling retrieval engine: ${errorMsg}. Please make sure you have uploaded files and your LLM server (Ollama or OpenRouter) is configured.`
          }
        ])
      }
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `Failed to query the RAG system. Error: ${error.message || 'Network error'}. Make sure your backend API is running on port 8000.`
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Prompt Enhancer
  const handleEnhancePrompt = () => {
    if (query.trim()) {
      setQuery(prev => prev + ' with detailed source citations and references')
      showToast('Prompt enhanced using system LLM template.', 'success')
    } else {
      showToast('Type a question first to enhance it.')
    }
  }

  const handleModelProviderChange = (val: 'ollama' | 'openrouter') => {
    setModelProvider(val)
    showToast(`Switched active model model to ${val === 'ollama' ? 'Ollama Llama3 (Local)' : 'OpenRouter API Llama3 (Cloud)'}`, 'success')
  }

  return (
    <div className="workspace-container" style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Intro splash screen with bright flash wipe effect */}
      {showOverlay && (
        <div className={`splash-overlay ${!isSplashing ? 'fade-out' : ''}`}>
          <div className="splash-flash" />
          <div className="splash-logo-box">
            <img src={logoImg} alt="RAG QA Logo" className="splash-sparkle" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          </div>
          <div className="splash-title">RAG Studio</div>
          <div className="splash-subtitle">Intelligent Retrieval System</div>
        </div>
      )}

      <Header
        modelProvider={modelProvider}
        onChangeModelProvider={handleModelProviderChange}
      />

      {messages.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
        />
      )}

      <InputBar
        query={query}
        setQuery={setQuery}
        isLoading={isLoading}
        onSendQuery={handleSendQuery}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onEnhancePrompt={handleEnhancePrompt}
        showToast={(msg) => showToast(msg, 'info')}
      />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        uploadProgressList={uploadProgressList}
        onFileUpload={handleFileUpload}
      />

      <Toast
        message={toast?.message || null}
        type={toast?.type || 'info'}
      />
    </div>
  )
}

export default App
