import React, { useState } from 'react';

export default function BackgroundPromptInput({ 
  onSubmit, 
  status, 
  progress, 
  error,
  isDisabled = false 
}) {
  const [prompt, setPrompt] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (prompt.trim() && status !== 'processing') {
      onSubmit(prompt);
      // Don't clear prompt immediately - let user see what they submitted
    }
  };

  const isGenerating = status === 'requesting' || status === 'processing';

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      right: 20,
      zIndex: 100,
      transition: 'all 0.3s ease',
    }}>
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          padding: '20px',
          borderRadius: '12px',
          minWidth: '320px',
          maxWidth: '400px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          border: '2px solid rgba(138, 43, 226, 0.5)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
          }}>
            <h3 style={{
              margin: 0,
              color: 'white',
              fontSize: '18px',
              fontFamily: 'Arial, sans-serif',
            }}>
              🎨 Generate Background
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                width: '30px',
                height: '30px',
              }}
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = '#999'}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your dream background... (e.g., 'A futuristic neon city at night' or 'Peaceful mountain sunset')"
              disabled={isGenerating}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(138, 43, 226, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                resize: 'vertical',
                marginBottom: '12px',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(138, 43, 226, 0.8)';
                e.target.style.outline = 'none';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(138, 43, 226, 0.3)';
              }}
            />

            {error && (
              <div style={{
                backgroundColor: 'rgba(255, 77, 77, 0.2)',
                border: '1px solid rgba(255, 77, 77, 0.5)',
                borderRadius: '6px',
                padding: '10px',
                marginBottom: '12px',
                color: '#ff6b6b',
                fontSize: '13px',
              }}>
                ❌ {error}
              </div>
            )}

            {progress && (
              <div style={{
                backgroundColor: 'rgba(138, 43, 226, 0.2)',
                border: '1px solid rgba(138, 43, 226, 0.5)',
                borderRadius: '6px',
                padding: '10px',
                marginBottom: '12px',
                color: '#b794f6',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                {isGenerating && (
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(138, 43, 226, 0.3)',
                    borderTopColor: '#b794f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                )}
                <span>{progress}</span>
              </div>
            )}

            {status === 'completed' && (
              <div style={{
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                border: '1px solid rgba(76, 175, 80, 0.5)',
                borderRadius: '6px',
                padding: '10px',
                marginBottom: '12px',
                color: '#81c784',
                fontSize: '13px',
              }}>
                ✅ Background updated!
              </div>
            )}

            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: isGenerating ? 'rgba(138, 43, 226, 0.5)' : 'rgba(138, 43, 226, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: !prompt.trim() || isGenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Arial, sans-serif',
              }}
              onMouseEnter={(e) => {
                if (prompt.trim() && !isGenerating) {
                  e.target.style.backgroundColor = 'rgba(147, 51, 234, 1)';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(138, 43, 226, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = isGenerating ? 'rgba(138, 43, 226, 0.5)' : 'rgba(138, 43, 226, 0.9)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              {isGenerating ? '⏳ Generating...' : '✨ Generate'}
            </button>

            <p style={{
              marginTop: '12px',
              marginBottom: '0',
              fontSize: '11px',
              color: '#999',
              textAlign: 'center',
            }}>
              AI will generate a custom background based on your prompt
            </p>
        </form>
      </div>

      {/* Add keyframe animation for spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

