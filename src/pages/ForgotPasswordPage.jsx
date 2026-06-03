import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, MailCheck } from 'lucide-react';
import styles from './LoginPage.module.css';
import fpStyles from './ForgotPasswordPage.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/forgot-password', {
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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link to="/" className={styles.logo}>
          <Shield size={24} color="#2563eb" />
          <span className={styles.brand}>DentalCare Pro</span>
        </Link>

        <h1 className={styles.title}>Resetare parolă</h1>
        <p className={styles.subtitle}>
          Introdu emailul contului tău și vei primi instrucțiuni de resetare.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        {!sent ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">
                <Mail size={14} style={{ display: 'inline', marginRight: 4 }} />
                Email
              </label>
              <input
                id="email"
                type="email"
                className={styles.input}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? 'Se procesează…' : 'Trimite instrucțiuni'}
            </button>
          </form>
        ) : (
          <div className={fpStyles.result}>
            <div className={fpStyles.emailSentBox}>
              <MailCheck size={32} color="#2563eb" />
              <p className={fpStyles.successMsg}>Email trimis!</p>
              <p className={fpStyles.emailSentText}>
                Am trimis instrucțiunile de resetare la <strong>{email}</strong>.
                Verifică și dosarul Spam dacă nu îl găsești în câteva minute.
              </p>
            </div>
            <Link to="/reset-password" className={`${styles.submit} ${fpStyles.resetLink}`}>
              Am primit tokenul → Resetează parola
            </Link>
          </div>
        )}

        <p className={styles.footer}>
          <Link to="/login" className={styles.link}>← Înapoi la autentificare</Link>
        </p>
      </div>
    </div>
  );
}
