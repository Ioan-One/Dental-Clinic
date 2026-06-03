import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Check, X } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import styles from './LoginPage.module.css';

const PASSWORD_RULES = [
  { id: 'length',  label: 'Minim 8 caractere',          test: (p) => p.length >= 8 },
  { id: 'upper',   label: 'O literă mare (A–Z)',          test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'O literă mică (a–z)',          test: (p) => /[a-z]/.test(p) },
  { id: 'number',  label: 'O cifră (0–9)',               test: (p) => /\d/.test(p) },
  { id: 'special', label: 'Un caracter special (!@#$…)',  test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirm: '',
  });
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleBlur  = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));

  const passwordChecks = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(form.password) }));
  const passwordValid  = passwordChecks.every((c) => c.ok);
  const emailValid     = isValidEmail(form.email);
  const confirmValid   = form.confirm === form.password && form.confirm !== '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, email: true, phone: true, password: true, confirm: true });
    if (!form.firstName || !form.lastName || !emailValid || !form.phone || !passwordValid || !confirmValid) return;

    setServerError('');
    setLoading(true);
    try {
      const { confirm, ...payload } = form;
      await register(payload);
      navigate('/appointments');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field, valid = true) =>
    `${styles.input} ${touched[field] && !valid ? styles.inputError : ''}`;

  return (
    <div className={styles.page}>
      <div className={`${styles.card} ${styles.cardWide}`}>
        <Link to="/" className={styles.logo}>
          <Shield size={24} color="#2563eb" />
          <span className={styles.brand}>DentalCare Pro</span>
        </Link>

        <h1 className={styles.title}>Creează cont</h1>
        <p className={styles.subtitle}>Înregistrează-te pentru a accesa platforma</p>

        {serverError && <div className={styles.error}>{serverError}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>

          {/* First name + Last name */}
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Prenume</label>
              <input name="firstName" className={inputClass('firstName', !!form.firstName)}
                value={form.firstName} onChange={handleChange} onBlur={handleBlur} />
              {touched.firstName && !form.firstName && (
                <span className={styles.fieldError}>Câmp obligatoriu</span>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Nume de familie</label>
              <input name="lastName" className={inputClass('lastName', !!form.lastName)}
                value={form.lastName} onChange={handleChange} onBlur={handleBlur} />
              {touched.lastName && !form.lastName && (
                <span className={styles.fieldError}>Câmp obligatoriu</span>
              )}
            </div>
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input name="email" type="text" autoComplete="email"
              className={inputClass('email', emailValid)}
              value={form.email} onChange={handleChange} onBlur={handleBlur} />
            {touched.email && !emailValid && (
              <span className={styles.fieldError}>
                {!form.email ? 'Câmp obligatoriu' : 'Adresă de email invalidă'}
              </span>
            )}
          </div>

          {/* Phone */}
          <div className={styles.field}>
            <label className={styles.label}>Număr de telefon</label>
            <input name="phone" type="tel" placeholder="+40 7xx xxx xxx"
              className={inputClass('phone', !!form.phone)}
              value={form.phone} onChange={handleChange} onBlur={handleBlur} />
            {touched.phone && !form.phone && (
              <span className={styles.fieldError}>Câmp obligatoriu</span>
            )}
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label className={styles.label}>Parolă</label>
            <input name="password" type="password" autoComplete="new-password"
              className={inputClass('password', !touched.password || passwordValid)}
              value={form.password} onChange={handleChange} onBlur={handleBlur} />
            {form.password && (
              <ul className={styles.passwordChecks}>
                {passwordChecks.map((c) => (
                  <li key={c.id} className={c.ok ? styles.checkOk : styles.checkFail}>
                    {c.ok ? <Check size={11} /> : <X size={11} />} {c.label}
                  </li>
                ))}
              </ul>
            )}
            {touched.password && !form.password && (
              <span className={styles.fieldError}>Câmp obligatoriu</span>
            )}
          </div>

          {/* Confirm password */}
          <div className={styles.field}>
            <label className={styles.label}>Confirmă parola</label>
            <input name="confirm" type="password" autoComplete="new-password"
              className={inputClass('confirm', !touched.confirm || confirmValid)}
              value={form.confirm} onChange={handleChange} onBlur={handleBlur} />
            {touched.confirm && form.confirm && !confirmValid && (
              <span className={styles.fieldError}>Parolele nu coincid</span>
            )}
            {touched.confirm && !form.confirm && (
              <span className={styles.fieldError}>Câmp obligatoriu</span>
            )}
          </div>

          {/* Role info */}
          <div className={styles.field}>
            <p className={styles.roleNote}>
              Conturile noi sunt create ca <strong>Pacient</strong>. Rolurile de medic, asistent sau administrator sunt atribuite de un administrator al clinicii.
            </p>
          </div>

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Se creează contul…' : 'Înregistrare'}
          </button>
        </form>

        <p className={styles.footer}>
          Ai deja cont?{' '}
          <Link to="/login" className={styles.link}>Autentifică-te</Link>
        </p>
      </div>
    </div>
  );
}
