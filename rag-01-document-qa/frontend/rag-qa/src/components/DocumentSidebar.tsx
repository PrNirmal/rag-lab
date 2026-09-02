import React, { useState } from 'react'
import {
  X,
  Trash2,
  FileText,
  Upload,
  RefreshCw,
  Search,
  Database,
  AlertTriangle,
  Loader2,
  FileCode,
  Layers,
  CheckCircle2,
  PanelRightClose
} from 'lucide-react'

export interface DocumentItem {
  filename: string
  total_chunks: number
  pages: number[]
  preview?: string
}

interface DocumentSidebarProps {
  isOpen: boolean
  onClose: () => void
  documents: DocumentItem[]
  isLoading: boolean
  onDeleteDocument: (filename: string) => Promise<void>
  onDeleteAllDocuments: () => Promise<void>
  onOpenUploadModal: () => void
  onRefresh: () => void
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  isOpen,
  onClose,
  documents,
  isLoading,
  onDeleteDocument,
  onDeleteAllDocuments,
  onOpenUploadModal,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<string | null>(null)
  const [isConfirmClearAll, setIsConfirmClearAll] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)

  if (!isOpen) return null

  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalChunksCount = documents.reduce((acc, doc) => acc + (doc.total_chunks || 0), 0)

  const handleDelete = async (filename: string) => {
    setDeletingFilename(filename)
    setConfirmDeleteDoc(null)
    try {
      await onDeleteDocument(filename)
    } finally {
      setDeletingFilename(null)
    }
  }

  const handleClearAll = async () => {
    setIsClearingAll(true)
    setIsConfirmClearAll(false)
    try {
      await onDeleteAllDocuments()
    } finally {
      setIsClearingAll(false)
    }
  }

  const getFileBadge = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    if (ext === 'pdf') {
      return { label: 'PDF', color: 'badge-pdf' }
    } else if (ext === 'docx' || ext === 'doc') {
      return { label: 'DOCX', color: 'badge-docx' }
    } else if (ext === 'txt' || ext === 'md') {
      return { label: 'TXT', color: 'badge-txt' }
    }
    return { label: ext.toUpperCase() || 'FILE', color: 'badge-default' }
  }

  return (
    <div className="sidebar-overlay" onClick={onClose}>
      <aside
        className="sidebar-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Documents Library Sidebar"
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-header-title-area">
            <div className="sidebar-icon-wrap">
              <Database size={18} className="sidebar-icon" />
            </div>
            <div>
              <h2 className="sidebar-title">Document Library</h2>
              <span className="sidebar-subtitle">
                {documents.length} {documents.length === 1 ? 'document' : 'documents'} indexed
              </span>
            </div>
          </div>
          <div className="sidebar-header-actions">
            <button
              className="sidebar-action-btn"
              title="Refresh document list"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw size={15} className={isLoading ? 'spinning' : ''} />
            </button>
            <button
              className="sidebar-action-btn close"
              title="Close sidebar (Esc)"
              onClick={onClose}
            >
              <PanelRightClose size={17} />
            </button>
          </div>
        </div>

        {/* Quick Action Bar: Upload & Search */}
        <div className="sidebar-toolbar">
          <button
            className="sidebar-upload-btn"
            onClick={() => {
              onClose()
              onOpenUploadModal()
            }}
          >
            <Upload size={14} />
            <span>Upload New</span>
          </button>
          {documents.length > 0 && (
            <button
              className="sidebar-clear-btn"
              onClick={() => setIsConfirmClearAll(true)}
              title="Delete all documents from DB"
              disabled={isClearingAll}
            >
              {isClearingAll ? <Loader2 size={13} className="spinning" /> : <Trash2 size={13} />}
              <span>Clear All</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        {documents.length > 0 && (
          <div className="sidebar-search-box">
            <Search size={14} className="sidebar-search-icon" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sidebar-search-input"
            />
            {searchTerm && (
              <button
                className="sidebar-search-clear"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Clear All Confirmation Modal/Banner */}
        {isConfirmClearAll && (
          <div className="sidebar-confirm-banner">
            <div className="confirm-header">
              <AlertTriangle size={16} className="warning-icon" />
              <span>Remove ALL documents?</span>
            </div>
            <p className="confirm-desc">
              This will permanently delete all {documents.length} documents and their vector embeddings from the database.
            </p>
            <div className="confirm-actions">
              <button
                className="confirm-btn danger"
                onClick={handleClearAll}
              >
                Yes, Delete All
              </button>
              <button
                className="confirm-btn cancel"
                onClick={() => setIsConfirmClearAll(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Document List */}
        <div className="sidebar-content">
          {isLoading && documents.length === 0 ? (
            <div className="sidebar-loading-state">
              <Loader2 size={24} className="spinning" />
              <span>Loading document index...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="sidebar-empty-state">
              {searchTerm ? (
                <>
                  <FileText size={36} className="empty-icon" />
                  <span className="empty-title">No matching documents</span>
                  <span className="empty-desc">
                    No documents found matching "{searchTerm}"
                  </span>
                  <button
                    className="sidebar-empty-btn"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Filter
                  </button>
                </>
              ) : (
                <>
                  <div className="empty-icon-wrap">
                    <Database size={32} className="empty-icon" />
                  </div>
                  <span className="empty-title">No documents uploaded</span>
                  <span className="empty-desc">
                    Upload your PDF, DOCX, or TXT documents to build your vector database.
                  </span>
                  <button
                    className="sidebar-empty-btn"
                    onClick={() => {
                      onClose()
                      onOpenUploadModal()
                    }}
                  >
                    <Upload size={14} style={{ marginRight: 6 }} />
                    Upload Documents
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="sidebar-doc-list">
              {filteredDocs.map((doc) => {
                const badge = getFileBadge(doc.filename)
                const isDeleting = deletingFilename === doc.filename
                const isConfirming = confirmDeleteDoc === doc.filename

                return (
                  <div key={doc.filename} className="sidebar-doc-card">
                    {/* Top Row: File icon, Name, Delete action */}
                    <div className="doc-card-top">
                      <div className="doc-card-info">
                        <span className={`file-badge ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="doc-card-filename" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </div>

                      <div className="doc-card-actions">
                        <button
                          className="doc-delete-btn"
                          title={`Delete "${doc.filename}" from DB`}
                          onClick={() => setConfirmDeleteDoc(isConfirming ? null : doc.filename)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 size={14} className="spinning" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Metadata stats */}
                    <div className="doc-card-meta">
                      <span className="meta-pill">
                        <Layers size={11} />
                        {doc.total_chunks} {doc.total_chunks === 1 ? 'chunk' : 'chunks'}
                      </span>
                      {doc.pages && doc.pages.length > 0 && (
                        <span className="meta-pill">
                          <FileCode size={11} />
                          {doc.pages.length === 1
                            ? `Page ${doc.pages[0]}`
                            : `${doc.pages.length} pages (${doc.pages[0]}-${doc.pages[doc.pages.length - 1]})`}
                        </span>
                      )}
                      <span className="meta-pill status-ready">
                        <CheckCircle2 size={10} />
                        Indexed
                      </span>
                    </div>

                    {/* Excerpt preview if available */}
                    {doc.preview && (
                      <div className="doc-card-preview" title="Document sample excerpt">
                        "{doc.preview}"
                      </div>
                    )}

                    {/* Inline Delete Confirmation */}
                    {isConfirming && (
                      <div className="doc-inline-confirm">
                        <span className="inline-confirm-text">
                          Remove this file from DB?
                        </span>
                        <div className="inline-confirm-btns">
                          <button
                            className="inline-btn-delete"
                            onClick={() => handleDelete(doc.filename)}
                          >
                            Delete
                          </button>
                          <button
                            className="inline-btn-cancel"
                            onClick={() => setConfirmDeleteDoc(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar Footer Stats */}
        {documents.length > 0 && (
          <div className="sidebar-footer">
            <div className="footer-stat">
              <span className="stat-label">Total Documents</span>
              <span className="stat-val">{documents.length}</span>
            </div>
            <div className="footer-divider" />
            <div className="footer-stat">
              <span className="stat-label">Vector Chunks</span>
              <span className="stat-val">{totalChunksCount}</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
