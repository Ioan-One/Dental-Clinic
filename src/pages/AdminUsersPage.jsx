import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shield, Stethoscope, UserCheck, User } from 'lucide-react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import styles from './AdminUsersPage.module.css';

const ROLE_META = {
  admin:     { label: 'Administrator', Icon: Shield,      color: 'admin' },
  doctor:    { label: 'Medic',         Icon: Stethoscope, color: 'doctor' },
  assistant: { label: 'Asistent',      Icon: UserCheck,   color: 'assistant' },
  patient:   { label: 'Pacient',       Icon: User,        color: 'patient' },
};

const BLANK = { firstName: '', lastName: '', email: '', password: '', role: 'doctor', phone: '', specialization: 'Stomatologie Generală' };

export default function AdminUsersPage() {
  const [users, setUsers]     = useState([]);
  const [form, setForm]       = useState(BLANK);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    fetchWithAuth('/api/admin/users')
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithAuth('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Eroare.'); return; }
      setSuccess(`Cont creat: ${data.firstName} ${data.lastName} (${ROLE_META[data.role]?.label})`);
      setForm(BLANK);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Ștergi contul lui ${name}?`)) return;
    await fetchWithAuth(`/api/admin/users/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Users size={28} />
        <div>
          <h1 className={styles.title}>Gestionare Conturi</h1>
          <p className={styles.subtitle}>Creează conturi de medic, asistent sau administrator</p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Create form ── */}
        <div className={styles.card}>
          <div className={styles.cardTitle}><UserPlus size={18} /> Cont nou</div>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Prenume</label>
                <input name="firstName" value={form.firstName} onChange={handleChange} required />
              </div>
              <div className={styles.field}>
                <label>Nume</label>
                <input name="lastName" value={form.lastName} onChange={handleChange} required />
              </div>
            </div>
            <div className={styles.field}>
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className={styles.field}>
              <label>Parolă</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} />
            </div>
            <div className={styles.field}>
              <label>Rol</label>
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="doctor">Medic</option>
                <option value="assistant">Asistent</option>
                <option value="admin">Administrator</option>
                <option value="patient">Pacient</option>
              </select>
            </div>
            {form.role === 'doctor' && (
              <>
                <div className={styles.field}>
                  <label>Specializare</label>
                  <input name="specialization" value={form.specialization} onChange={handleChange} />
                </div>
                <div className={styles.field}>
                  <label>Telefon</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="+40 700 000 000" />
                </div>
              </>
            )}
            {error   && <p className={styles.error}>{error}</p>}
            {success && <p className={styles.success}>{success}</p>}
            <button type="submit" className={styles.submitBtn} disabled={saving}>
              {saving ? 'Se creează…' : 'Creează cont'}
            </button>
          </form>
        </div>

        {/* ── User list ── */}
        <div className={styles.card}>
          <div className={styles.cardTitle}><Users size={18} /> Conturi existente ({users.length})</div>
          {error && <p className={styles.error}>{error}</p>}
          {loading ? (
            <p className={styles.empty}>Se încarcă…</p>
          ) : !error && users.length === 0 ? (
            <p className={styles.empty}>Niciun cont.</p>
          ) : (
            <ul className={styles.userList}>
              {users.map(u => {
                const meta = ROLE_META[u.role] ?? ROLE_META.patient;
                const Icon = meta.Icon;
                return (
                  <li key={u.id} className={styles.userItem}>
                    <div className={`${styles.roleIcon} ${styles[meta.color]}`}>
                      <Icon size={16} />
                    </div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{u.firstName} {u.lastName}</span>
                      <span className={styles.userEmail}>{u.email}</span>
                    </div>
                    <span className={`${styles.roleBadge} ${styles[meta.color]}`}>{meta.label}</span>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(u.id, `${u.firstName} ${u.lastName}`)}
                      title="Șterge cont"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
