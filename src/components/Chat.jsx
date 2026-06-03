import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X, Send } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import styles from './Chat.module.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
// Vite proxies /ws → Express WS server; Express also accepts /ws directly
const WS_URL = API_BASE.replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws')) + '/ws';

const fmt = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
};

export default function Chat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const openRef = useRef(open);

  // Load message history — only when logged in
  useEffect(() => {
    if (!user) return;
    fetchWithAuth(`${API_BASE}/api/chat/messages`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setMessages(data))
      .catch(() => {});
  }, [user]);

  // Keep openRef in sync so the onmessage closure can read current value
  useEffect(() => { openRef.current = open; }, [open]);

  // WebSocket connection — only when logged in
  useEffect(() => {
    if (!user) return;

    let ws;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'CHAT_MESSAGE') {
              setMessages((prev) => [...prev, msg.payload]);
              setUnread((n) => (openRef.current ? 0 : n + 1));
            }
          } catch {}
        };

        ws.onclose = () => { if (!cancelled) setTimeout(connect, 3000); };
      } catch {}
    };
    connect();
    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Clear unread when opened
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const send = useCallback(() => {
    if (!text.trim() || !user || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'CHAT_SEND',
      payload: {
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        senderRole: user.role,
        message: text.trim(),
      },
    }));
    setText('');
  }, [text, user]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (!user) return null;

  return (
    <>
      {/* ── Floating button — hidden on mobile when panel is open ── */}
      <button
        className={`${styles.trigger} ${open ? styles.triggerHidden : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Chat"
      >
        <MessageCircle size={22} />
        {unread > 0 && <span className={styles.badge}>{unread}</span>}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <MessageCircle size={18} />
              <div>
                <div className={styles.headerTitle}>Chat în timp real</div>
                <div className={styles.headerSub}>
                  {user ? `${user.firstName} ${user.lastName}` : 'Neautentificat'}
                </div>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className={styles.messages}>
            {messages.length === 0 && (
              <p className={styles.empty}>Niciun mesaj încă. Fii primul!</p>
            )}
            {messages.map((m) => {
              const mine = m.senderId === user?.id;
              return (
                <div key={m._id ?? m.createdAt} className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs}`}>
                  <div className={styles.msgMeta}>
                    {!mine && <strong>{m.senderName}</strong>}
                    <span className={`${styles.rolePill} ${styles[m.senderRole] ?? styles.normal}`}>
                      {m.senderRole}
                    </span>
                  </div>
                  <div className={styles.bubble}>{m.message}</div>
                  <span className={styles.time}>{fmt(m.createdAt)}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {user ? (
            <div className={styles.inputRow}>
              <input
                ref={inputRef}
                className={styles.input}
                placeholder="Scrie un mesaj…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKey}
                maxLength={500}
              />
              <button
                className={styles.sendBtn}
                onClick={send}
                disabled={!text.trim()}
                aria-label="Trimite"
              >
                <Send size={16} />
              </button>
            </div>
          ) : (
            <div className={styles.loginPrompt}>
              <Link to="/login">Autentifică-te</Link> pentru a putea trimite mesaje.
            </div>
          )}
        </div>
      )}
    </>
  );
}
