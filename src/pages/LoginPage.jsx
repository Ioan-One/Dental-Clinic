import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import styles from './LoginPage.module.css';

// ── OTP Login ─────────────────────────────────────────────────────
function OtpLogin() {
  const { loginWithData } = useAuth();
  const navigate = useNavigate();
  const [step, setStep]       = useState('email'); // 'email' | 'code'
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');

  const requestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/otp/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Eroare.'); return; }
      setInfo(data.message);
      setStep('code');
    } catch {
      setError('Eroare de rețea.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/otp/verify', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Cod invalid.'); return; }

      loginWithData(data);

      if (data.role === 'patient' && data.patientId) {
        navigate(`/patient/${data.patientId}`);
      } else {
        navigate('/appointments');
      }
    } catch {
      setError('Eroare de rețea.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}
      {info  && step === 'code' && <div className={styles.success}>{info}</div>}

      {step === 'email' ? (
        <form className={styles.form} onSubmit={requestOtp}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="otp-email">Email</label>
            <input
              id="otp-email"
              type="email"
              className={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Se trimite…' : 'Trimite cod'}
          </button>
        </form>
      ) : (
        <form className={styles.form} onSubmit={verifyOtp}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="otp-code">
              Cod primit pe email
            </label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              className={styles.input}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoComplete="one-time-code"
              required
            />
          </div>
          <button type="submit" className={styles.submit} disabled={loading || code.length !== 6}>
            {loading ? 'Se verifică…' : 'Autentificare'}
          </button>
          <button
            type="button"
            className={styles.link}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', padding: 0 }}
            onClick={() => { setStep('email'); setCode(''); setError(''); setInfo(''); }}
          >
            ← Schimbă emailul
          </button>
        </form>
      )}
    </>
  );
}

// ── Password Login ────────────────────────────────────────────────
function PasswordLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      if (data.role === 'patient' && data.patientId) {
        navigate(`/patient/${data.patientId}`);
      } else {
        navigate('/appointments');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className={styles.input}
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">Parolă</label>
          <input
            id="password"
            name="password"
            type="password"
            className={styles.input}
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? 'Se autentifică…' : 'Autentificare'}
        </button>
      </form>

      <p className={styles.footer}>
        <Link to="/forgot-password" className={styles.link}>Ai uitat parola?</Link>
      </p>
    </>
  );
}

// ── Magic Link Login ──────────────────────────────────────────────
function MagicLinkLogin() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/magic/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Eroare.'); return; }
      setSent(true);
    } catch {
      setError('Eroare de rețea.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <Mail size={36} color="#2563eb" style={{ margin: '0 auto 0.75rem' }} />
        <p style={{ fontWeight: 600, color: '#111827', marginBottom: '0.375rem' }}>Email trimis!</p>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>
          Am trimis un link de autentificare la <strong>{email}</strong>.<br />
          Dă click pe link pentru a te autentifica automat.
        </p>
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.75rem' }}>
          Linkul expiră în 15 minute.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="magic-email">Email</label>
          <input
            id="magic-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? 'Se trimite…' : 'Trimite link de autentificare'}
        </button>
      </form>
      <p className={styles.footer} style={{ fontSize: '0.8rem' }}>
        Vei primi un link pe email. Un singur click și ești autentificat — fără parolă.
      </p>
    </>
  );
}

// ── Main LoginPage ────────────────────────────────────────────────
export default function LoginPage() {
  const [tab, setTab] = useState('password'); // 'password' | 'otp' | 'magic'

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link to="/" className={styles.logo}>
          <Shield size={24} color="#2563eb" />
          <span className={styles.brand}>DentalCare Pro</span>
        </Link>

        <h1 className={styles.title}>Bun venit înapoi</h1>

        <div className={styles.tabRow}>
          <button
            className={`${styles.tabBtn} ${tab === 'password' ? styles.tabActive : ''}`}
            onClick={() => setTab('password')}
            type="button"
          >
            Parolă
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'otp' ? styles.tabActive : ''}`}
            onClick={() => setTab('otp')}
            type="button"
          >
            <Mail size={13} style={{ display: 'inline', marginRight: 3 }} />
            Cod OTP
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'magic' ? styles.tabActive : ''}`}
            onClick={() => setTab('magic')}
            type="button"
          >
            <LinkIcon size={13} style={{ display: 'inline', marginRight: 3 }} />
            Magic Link
          </button>
        </div>

        {tab === 'password' && <PasswordLogin />}
        {tab === 'otp'      && <OtpLogin />}
        {tab === 'magic'    && <MagicLinkLogin />}

        <p className={styles.footer}>
          Nu ai cont?{' '}
          <Link to="/register" className={styles.link}>Înregistrează-te</Link>
        </p>
      </div>
    </div>
  );
}
