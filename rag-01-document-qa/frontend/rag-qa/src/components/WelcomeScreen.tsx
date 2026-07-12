import React from 'react'
import { Cpu, Search, FileCheck } from 'lucide-react'
import logoImg from '../assets/logo.png'

export const WelcomeScreen: React.FC = () => {
  return (
    <div className="main-content">
      <div className="welcome-section">
        <div className="sparkle-container">
          <div className="ripple"></div>
          <div className="ripple"></div>
          <div className="ripple"></div>
          <div className="sparkle-card">
            <img src={logoImg} alt="RAG QA" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          </div>
        </div>
        <h1 className="welcome-title">Intelligent Retrieval</h1>
        <p className="welcome-subtitle">
          Upload your documents and ask anything. Our RAG engine will synthesize answers with verified citations.
        </p>

        {/* Capabilities Grid - What the engine is capable of */}
        <div className="capabilities-grid">
          <div className="capability-card">
            <div className="capability-icon-box">
              <Search size={16} />
            </div>
            <h3 className="capability-title">Vector Semantics</h3>
            <p className="capability-desc">
              Embeds text chunks using deep learning models for high-dimensional semantic match similarity.
            </p>
          </div>

          <div className="capability-card">
            <div className="capability-icon-box">
              <Cpu size={16} />
            </div>
            <h3 className="capability-title">Context Synthesis</h3>
            <p className="capability-desc">
              Combines retrieved passages directly into prompts for localized context-guided answers.
            </p>
          </div>

          <div className="capability-card">
            <div className="capability-icon-box">
              <FileCheck size={16} />
            </div>
            <h3 className="capability-title font-sans">Source Citations</h3>
            <p className="capability-desc">
              Extracts precise document names, page locations, and section lines for strict validation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
