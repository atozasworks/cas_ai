import React, { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { FiMessageSquare, FiSend, FiCpu } from 'react-icons/fi';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I\'m CAS-AI, your driving safety assistant. Ask me anything about road safety or your current driving conditions.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { riskData, lastPosition } = useSocket();
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const drivingContext = lastPosition ? {
        speed: lastPosition.speed,
        riskLevel: riskData?.riskLevel,
        nearbyCount: riskData?.nearbyVehicles?.length || 0,
      } : null;

      const data = await aiAPI.chat(userMsg, drivingContext);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: data.reply,
        provider: data.provider,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: 'Sorry, I could not process your request. Please try again.',
      }]);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <FiCpu style={{ color: '#a855f7' }} />
        <h4 style={styles.title}>AI Safety Assistant</h4>
      </div>

      <div ref={listRef} style={styles.messages} className="scroll-y">
        {messages.map((msg, i) => (
          <div key={i} style={{
            ...styles.message,
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user' ? 'rgba(59,130,246,0.15)' : 'var(--bg-tertiary)',
            borderBottomRightRadius: msg.role === 'user' ? 4 : 12,
            borderBottomLeftRadius: msg.role === 'user' ? 12 : 4,
          }}>
            {msg.text}
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.message, background: 'var(--bg-tertiary)' }}>
            <span style={{ animation: 'pulse 1s ease infinite' }}>Thinking...</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} style={styles.inputRow}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about road safety..."
          style={styles.input}
        />
        <button type="submit" disabled={loading || !input.trim()} style={styles.sendBtn}>
          <FiSend />
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 300,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  messages: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 280,
    overflowY: 'auto',
    paddingRight: 4,
    marginBottom: 12,
  },
  message: {
    padding: '8px 12px',
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.5,
    maxWidth: '85%',
    color: 'var(--text-primary)',
    wordBreak: 'break-word',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    fontSize: 13,
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 8,
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
};
