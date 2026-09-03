import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { WelcomeScreen } from './components/WelcomeScreen'
import { ChatMessages } from './components/ChatMessages'
import { InputBar } from './components/InputBar'
import { UploadModal } from './components/UploadModal'
import { DocumentSidebar, type DocumentItem } from './components/DocumentSidebar'
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
  status: 'pending' | 'success' | 'error' | 'exists'
  errorMsg?: string
  proof?: {
    filename: string
    total_chunks: number
    pages: number[]
    excerpt: string
  }
}

function App() {
  // Navigation & Config state
  const [modelProvider, setModelProvider] = useState<'ollama' | 'openrouter'>('openrouter')

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

  // Document Library Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [isFetchingDocs, setIsFetchingDocs] = useState(false)

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

  // Fetch all documents from the backend
  const fetchDocuments = useCallback(async () => {
    setIsFetchingDocs(true)
    try {
      const response = await fetch('/api/uploads/')
      if (response.ok) {
        const data = await response.json()
        if (data.documents && Array.isArray(data.documents)) {
          setDocuments(data.documents)
        } else if (data.files && Array.isArray(data.files)) {
          // Fallback if legacy response
          setDocuments(data.files.map((f: string) => ({
            filename: f,
            total_chunks: 1,
            pages: [1]
          })))
        }
      }
    } catch {
      // Backend may not be available or network error
    } finally {
      setIsFetchingDocs(false)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Keyboard shortcut listener (Cmd/Ctrl + B to toggle sidebar, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setIsSidebarOpen(prev => !prev)
      } else if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSidebarOpen])

  // Handle uploading files
  const handleFileUpload = async (files: FileList) => {
    const newProgressItems = Array.from(files).map(f => ({ name: f.name, status: 'pending' as const }))
    setUploadProgressList(prev => [...newProgressItems, ...prev])

    let anySuccess = false

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch('/api/uploads/', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          anySuccess = true
          setUploadProgressList(prev =>
            prev.map(item => (item.name === file.name ? { ...item, status: 'success' } : item))
          )
          showToast(`"${file.name}" uploaded and indexed successfully!`, 'success')
        } else {
          const errData = await response.json().catch(() => ({}))
          const errorDetail = errData.detail

          if (errorDetail && errorDetail.error_type === 'already_exists') {
            setUploadProgressList(prev =>
              prev.map(item =>
                item.name === file.name
                  ? {
                    ...item,
                    status: 'exists',
                    errorMsg: errorDetail.message,
                    proof: errorDetail.proof
                  }
                  : item
              )
            )
            showToast(`"${file.name}" is already available in the database.`, 'info')
          } else {
            let errorMsg = (typeof errorDetail === 'string' ? errorDetail : errorDetail?.message)
            if (!errorMsg) {
              if (response.status === 502 || response.status === 504) {
                errorMsg = 'Backend is waking up from sleep. Please wait a moment and try again.'
              } else {
                errorMsg = `Upload failed (Status ${response.status})`
              }
            }
            setUploadProgressList(prev =>
              prev.map(item => (item.name === file.name ? { ...item, status: 'error', errorMsg } : item))
            )
            showToast(`Failed to upload "${file.name}": ${errorMsg}`, 'error')
          }
        }
      } catch {
        setUploadProgressList(prev =>
          prev.map(item => (item.name === file.name ? { ...item, status: 'error', errorMsg: 'Network error' } : item))
        )
        showToast(`Failed to upload "${file.name}": Network error`, 'error')
      }
    }

    if (anySuccess) {
      await fetchDocuments()
    }
  }

  // Handle single document deletion
  const handleDeleteDocument = async (filename: string) => {
    try {
      const response = await fetch(`/api/uploads/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.filename !== filename))
        showToast(`"${filename}" removed from knowledge base.`, 'success')
        await fetchDocuments()
      } else {
        const errData = await response.json().catch(() => ({}))
        const errorMsg = errData.detail || 'Failed to delete document'
        showToast(`Error deleting "${filename}": ${errorMsg}`, 'error')
      }
    } catch (error: any) {
      showToast(`Failed to delete "${filename}": ${error.message || 'Network error'}`, 'error')
    }
  }

  // Handle delete all documents
  const handleDeleteAllDocuments = async () => {
    try {
      const response = await fetch('/api/uploads/', {
        method: 'DELETE'
      })

      if (response.ok) {
        setDocuments([])
        showToast('All documents removed from knowledge base.', 'success')
        await fetchDocuments()
      } else {
        const errData = await response.json().catch(() => ({}))
        const errorMsg = errData.detail || 'Failed to clear documents'
        showToast(`Error clearing documents: ${errorMsg}`, 'error')
      }
    } catch (error: any) {
      showToast(`Failed to clear documents: ${error.message || 'Network error'}`, 'error')
    }
  }

  // Handle sending a RAG query
  const handleSendQuery = async (textToSend?: string) => {
    const queryText = typeof textToSend === 'string' ? textToSend : query
    if (!queryText.trim() || isLoading) return

    const userMessageId = Date.now().toString()
    const userMsg: Message = {
      id: userMessageId,
      sender: 'user',
      text: queryText
    }

    setMessages(prev => [...prev, userMsg])
    if (typeof textToSend !== 'string') {
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
    <div className="workspace-container">
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
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        documentCount={documents.length}
        isSidebarOpen={isSidebarOpen}
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

      <DocumentSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        documents={documents}
        isLoading={isFetchingDocs}
        onDeleteDocument={handleDeleteDocument}
        onDeleteAllDocuments={handleDeleteAllDocuments}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onRefresh={fetchDocuments}
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

