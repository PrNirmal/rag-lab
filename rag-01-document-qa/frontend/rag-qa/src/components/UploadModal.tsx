import React, { useRef, useState } from 'react'
import { X, Upload, Loader2, Check, AlertCircle } from 'lucide-react'

interface UploadProgress {
  name: string
  status: 'pending' | 'success' | 'error'
  errorMsg?: string
}

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  uploadProgressList: UploadProgress[]
  onFileUpload: (files: FileList) => void
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  uploadProgressList,
  onFileUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Upload Documents</span>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div
          className={`drag-drop-zone ${isDragOver ? 'active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragOver(false)
            if (e.dataTransfer.files) {
              onFileUpload(e.dataTransfer.files)
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={32} className="drag-drop-icon" />
          <span className="drag-drop-text">Drag and drop documents here</span>
          <span className="drag-drop-subtext">Supports PDF, DOCX, TXT (Max 20MB)</span>
          <input
            type="file"
            multiple
            className="file-input"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files) {
                onFileUpload(e.target.files)
              }
            }}
          />
        </div>

        {uploadProgressList.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="section-label" style={{ marginBottom: 8 }}>Indexing Status</div>
            <div className="upload-progress-list">
              {uploadProgressList.map((item, idx) => (
                <div className="upload-progress-item" key={idx}>
                  <span className="upload-file-name">{item.name}</span>
                  <span className={`upload-status ${item.status}`}>
                    {item.status === 'pending' && (
                      <>
                        <Loader2 size={12} className="loading-spinner" style={{ animation: 'spin 1s linear infinite' }} />
                        <span>INDEXING</span>
                      </>
                    )}
                    {item.status === 'success' && (
                      <>
                        <Check size={12} />
                        <span>READY</span>
                      </>
                    )}
                    {item.status === 'error' && (
                      <>
                        <span title={item.errorMsg} style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <AlertCircle size={12} />
                        </span>
                        <span>FAILED</span>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
