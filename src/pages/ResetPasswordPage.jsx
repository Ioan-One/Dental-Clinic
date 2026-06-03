import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Check, X } from 'lucide-react';
import styles from './LoginPage.module.css';

const PASSWORD_RULES = [
  { id: 'length',  label: 'Minim 8 caractere',         test: (p) => p.length >= 8 },
  { id: 'upper',   label: 'O literă mare (A–Z)',         test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'O literă mică (a–z)',         test: (p) => /[a-z]/.test(p) },
  { id: 'number',  label: 'O cifră (0–9)',              test: (p) => /\d/.test(p) },
  { id: 'special', label: 'Un caracter special (!@#$…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ token: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const checks       = PASSWORD_RULES.map(r => ({ ...r, ok: r.test(form.password) }));
  const passwordOk   = checks.every(c => c.ok);
  const confirmOk    = form.confirm === form.password && form.confirm !== '';

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passwordOk || !confirmOk) return;
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token: form.token, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Eroare.'); return; }
      setSuccess(data.message);
      setTimeout(() => navigate('/login'), 2500);
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

        <h1 className={styles.title}>Parolă nouă</h1>
        <p className={styles.subtitle}>Introdu tokenul primit și alege o parolă nouă.</p>

        {error   && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        {!success && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label}>Token de resetare</label>
              <input
                name="token"
                type="text"
                className={styles.input}
                value={form.token}
                onChange={handleChange}
                placeholder="Lipește tokenul primit…"
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Parolă nouă</label>
              <input
                name="password"
                type="password"
                className={styles.input}
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              {form.password && (
                <ul className={styles.passwordChecks}>
                  {checks.map(c => (
                    <li key={c.id} className={c.ok ? styles.checkOk : styles.checkFail}>
                      {c.ok ? <Check size={11} /> : <X size={11} />} {c.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Confirmă parola</label>
              <input
                name="confirm"
                type="password"
                className={styles.input}
                value={form.confirm}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              {form.confirm && !confirmOk && (
                <span className={styles.fieldError}>Parolele nu coincid</span>
              )}
            </div>

            <button
              type="submit"
              className={styles.submit}
              disabled={loading || !passwordOk || !confirmOk}
            >
              {loading ? 'Se salvează…' : 'Salvează parola'}
            </button>
          </form>
        )}

        <p className={styles.footer}>
          <Link to="/login" className={styles.link}>← Înapoi la autentificare</Link>
        </p>
      </div>
    </div>
  );
}
