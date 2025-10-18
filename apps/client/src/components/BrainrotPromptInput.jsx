import React, { useState } from 'react';

export default function BrainrotPromptInput({ onSubmit, status, error }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState('ai'); // 'ai' or 'custom'

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(prompt.trim(), mode);
      setPrompt('');
      setIsExpanded(false);
    } catch (err) {
      console.error('Brainrot prompt submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setPrompt('');
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 80,
      right: 20,
      zIndex: 1000
    }}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          backgroundColor: 'rgba(255, 0, 150, 0.8)',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontFamily: 'Arial, sans-serif',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 0, 150, 1)';
          e.target.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 0, 150, 0.8)';
          e.target.style.transform = 'scale(1)';
        }}
      >
        🤖 AI Brainrot
      </button>

      {/* Expanded Input Form */}
      {isExpanded && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          marginBottom: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          border: '2px solid rgba(255, 0, 150, 0.8)',
          borderRadius: '12px',
          padding: '20px',
          minWidth: '300px',
          maxWidth: '400px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            marginBottom: '15px'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#ff0096'
            }}>
              🎤 AI Brainrot Script Generator
            </div>
            <div style={{
              fontSize: '12px',
              opacity: 0.8,
              lineHeight: '1.4',
              marginBottom: '10px'
            }}>
              {mode === 'ai' 
                ? 'Give AI a theme or idea, and it will generate a crazy brainrot script!'
                : 'Write your own custom script for everyone!'
              }
            </div>
            
            {/* Mode Toggle */}
            <div style={{
              display: 'flex',
              gap: '5px',
              marginBottom: '10px'
            }}>
              <button
                type="button"
                onClick={() => setMode('ai')}
                style={{
                  backgroundColor: mode === 'ai' ? '#ff0096' : 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: mode === 'ai' ? 'bold' : 'normal'
                }}
              >
                🤖 AI Generate
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                style={{
                  backgroundColor: mode === 'custom' ? '#ff0096' : 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: mode === 'custom' ? 'bold' : 'normal'
                }}
              >
                ✍️ Custom Script
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === 'ai' 
                ? "Enter a theme or idea for AI to generate a brainrot script... (e.g., 'space adventure', 'zombie apocalypse', 'underwater world')"
                : "Enter your custom brainrot script here... (e.g., 'Yo gamers! Today we're doing the most insane parkour ever! BOOM!')"
              }
              style={{
                width: '100%',
                height: '120px',
                padding: '12px',
                border: '1px solid rgba(255, 0, 150, 0.5)',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '14px',
                fontFamily: 'Arial, sans-serif',
                resize: 'vertical',
                outline: 'none',
                marginBottom: '15px'
              }}
              disabled={isSubmitting}
            />

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  setPrompt('');
                }}
                style={{
                  backgroundColor: 'rgba(100, 100, 100, 0.8)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif'
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!prompt.trim() || isSubmitting}
                style={{
                  backgroundColor: prompt.trim() && !isSubmitting ? 'rgba(255, 0, 150, 0.8)' : 'rgba(100, 100, 100, 0.5)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: prompt.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: 'bold'
                }}
              >
                {isSubmitting 
                  ? (mode === 'ai' ? '🤖 AI Generating...' : '🎤 Generating...') 
                  : (mode === 'ai' ? '🤖 Generate AI Script' : '🎤 Generate Voice')
                }
              </button>
            </div>
          </form>

          {/* Status Messages */}
          {status === 'generating' && (
            <div style={{
              marginTop: '10px',
              padding: '8px',
              backgroundColor: 'rgba(255, 165, 0, 0.2)',
              border: '1px solid rgba(255, 165, 0, 0.5)',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#ffa500'
            }}>
              🎤 Generating voice for everyone...
            </div>
          )}

          {error && (
            <div style={{
              marginTop: '10px',
              padding: '8px',
              backgroundColor: 'rgba(255, 0, 0, 0.2)',
              border: '1px solid rgba(255, 0, 0, 0.5)',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#ff4444'
            }}>
              ❌ {error}
            </div>
          )}

          {status === 'success' && (
            <div style={{
              marginTop: '10px',
              padding: '8px',
              backgroundColor: 'rgba(0, 255, 0, 0.2)',
              border: '1px solid rgba(0, 255, 0, 0.5)',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#44ff44'
            }}>
              ✅ Voice generated and sent to all players!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
