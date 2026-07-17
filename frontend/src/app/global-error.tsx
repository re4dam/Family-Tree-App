'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <head>
        <title>Application Error</title>
      </head>
      <body>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh', 
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#0b0f19',
          color: '#f3f4f6',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: '#ef4444' }}>
            Something went wrong!
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px', maxWidth: '400px' }}>
            An unexpected error occurred in the application. Please try reloading the page.
          </p>
          <button 
            onClick={() => reset()} 
            style={{ 
              padding: '10px 20px', 
              borderRadius: '8px', 
              backgroundColor: '#6366f1', 
              color: 'white', 
              border: 'none', 
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
