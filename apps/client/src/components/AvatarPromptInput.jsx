import React, { useState } from 'react';

export default function AvatarPromptInput({ onSubmit, status, error }) {
  const [prompt, setPrompt] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmit(prompt.trim());
  };

  const isBusy = status === 'requesting' || status === 'processing';

  return (
    <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 110 }}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          disabled={isBusy}
          style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: isBusy ? '#777' : '#7c3aed', color: 'white', fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
        >
          {isBusy ? 'Generating…' : 'Set Avatar'}
        </button>
      ) : (
        <div style={{ background: 'rgba(0,0,0,0.75)', padding: 12, borderRadius: 10, minWidth: 320, border: '1px solid rgba(124,58,237,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ color: 'white', fontWeight: 700 }}>Set Avatar</div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 18 }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your avatar (e.g., cyber ninja)"
              disabled={isBusy}
              style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #555', width: 240, background: 'rgba(255,255,255,0.9)' }}
            />
            <button type="submit" disabled={!prompt.trim() || isBusy} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: isBusy ? '#777' : '#7c3aed', color: 'white', fontWeight: 600, cursor: isBusy ? 'not-allowed' : 'pointer' }}>
              {isBusy ? 'Generating…' : 'Apply'}
            </button>
          </form>
          {error && (
            <div style={{ marginTop: 6, color: '#ff6b6b', fontSize: 12 }}>❌ {error}</div>
          )}
        </div>
      )}
    </div>
  );
}


