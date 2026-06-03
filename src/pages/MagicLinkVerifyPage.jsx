import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import styles from './LoginPage.module.css';

export default function MagicLinkVerifyPage() {
  const { loginWithData } = useAuth();
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setStatus('error'); setMessage('Link invalid.'); return; }

    fetch('/api/auth/magic/verify', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setStatus('error'); setMessage(data.error || 'Link invalid sau expirat.'); return; }
        loginWithData(data);
        setStatus('success');
        setTimeout(() => {
          if (data.role === 'patient' && data.patientId) {
            navigate(`/patient/${data.patientId}`, { replace: true });
          } else {
            navigate('/appointments', { replace: true });
          }
        }, 1500);
      })
      .catch(() => { setStatus('error'); setMessage('Eroare de rețea.'); });
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.card} style={{ textAlign: 'center' }}>
        <Link to="/" className={styles.logo} style={{ justifyContent: 'center' }}>
          <Shield size={24} color="#2563eb" />
          <span className={styles.brand}>DentalCare Pro</span>
        </Link>

        {status === 'loading' && (
          <>
            <Loader size={40} color="#2563eb" style={{ animation: 'spin 1s linear infinite', margin: '1.5rem auto' }} />
            <p style={{ color: '#6b7280' }}>Se verifică linkul…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={40} color="#16a34a" style={{ margin: '1.5rem auto' }} />
            <h2 className={styles.title} style={{ color: '#16a34a' }}>Autentificat!</h2>
            <p style={{ color: '#6b7280' }}>Te redirecționăm…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={40} color="#dc2626" style={{ margin: '1.5rem auto' }} />
            <h2 className={styles.title}>Link invalid</h2>
            <p className={styles.error}>{message}</p>
            <Link to="/login" className={styles.submit} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '1rem' }}>
              Înapoi la autentificare
            </Link>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
