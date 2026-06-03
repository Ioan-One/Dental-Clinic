import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, FileText, User } from 'lucide-react';
import { useData } from '../store/DataStore';
import { useAuth } from '../store/AuthContext';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import styles from './DetailView.module.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const TOOTH_NAMES = {
  1: 'Molar de Minte (M3)', 2: 'Molarul 2 (M2)', 3: 'Molarul 1 (M1)', 4: 'Premolarul 2 (P2)', 5: 'Premolarul 1 (P1)', 6: 'Canin (C)', 7: 'Incisiv Lateral (IL)', 8: 'Incisiv Central (IC)',
  9: 'Incisiv Central (IC)', 10: 'Incisiv Lateral (IL)', 11: 'Canin (C)', 12: 'Premolarul 1 (P1)', 13: 'Premolarul 2 (P2)', 14: 'Molarul 1 (M1)', 15: 'Molarul 2 (M2)', 16: 'Molar de Minte (M3)',
  17: 'Molar de Minte (M3)', 18: 'Molarul 2 (M2)', 19: 'Molarul 1 (M1)', 20: 'Premolarul 2 (P2)', 21: 'Premolarul 1 (P1)', 22: 'Canin (C)', 23: 'Incisiv Lateral (IL)', 24: 'Incisiv Central (IC)',
  25: 'Incisiv Central (IC)', 26: 'Incisiv Lateral (IL)', 27: 'Canin (C)', 28: 'Premolarul 1 (P1)', 29: 'Premolarul 2 (P2)', 30: 'Molarul 1 (M1)', 31: 'Molarul 2 (M2)', 32: 'Molar de Minte (M3)'
};

const STATUS_MAP = {
  HEALTHY: 'Sănătos',
  WATCH: 'Sub Observație',
  CRITICAL: 'Critic',
  healthy: 'Sănătos',
  watch: 'Sub Observație',
  critical: 'Critic'
};

const TOOTH_POSITIONS = {
  1: { left: '26%', top: '44%' },
  2: { left: '26%', top: '35%' },
  3: { left: '29%', top: '28%' },
  4: { left: '32%', top: '22%' },
  5: { left: '35.5%', top: '16%' },
  6: { left: '40%', top: '11.5%' },
  7: { left: '44.5%', top: '9%' },
  8: { left: '49.5%', top: '8%' },
  9: { left: '54.5%', top: '8%' },
  10: { left: '59.5%', top: '9%' },
  11: { left: '64%', top: '11.5%' },
  12: { left: '68.5%', top: '16%' },
  13: { left: '72%', top: '22%' },
  14: { left: '75%', top: '28%' },
  15: { left: '78%', top: '35%' },
  16: { left: '78%', top: '44%' },
  17: { left: '76%', top: '53%' },
  18: { left: '76%', top: '62%' },
  19: { left: '73%', top: '70%' },
  20: { left: '69%', top: '76%' },
  21: { left: '64.5%', top: '81%' },
  22: { left: '60%', top: '86%' },
  23: { left: '55%', top: '89.5%' },
  24: { left: '50.5%', top: '90.5%' },
  25: { left: '46%', top: '90.5%' },
  26: { left: '41.5%', top: '89.5%' },
  27: { left: '36.5%', top: '86%' },
  28: { left: '32%', top: '81%' },
  29: { left: '27.5%', top: '76%' },
  30: { left: '23.5%', top: '70%' },
  31: { left: '20.5%', top: '62%' },
  32: { left: '20.5%', top: '53%' }
};

export default function DetailView() {
  const { id } = useParams();
  const { getPatientById } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPatient = user?.role === 'patient';

  // Patients can only view their own dental map
  useEffect(() => {
    if (user?.role === 'patient' && user?.patientId && parseInt(id) !== user.patientId) {
      navigate(`/patient/${user.patientId}`, { replace: true });
    }
  }, [user, id, navigate]);

  const [patient, setPatient] = useState(null);
  const [teethData, setTeethData] = useState({});
  const [teethRecords, setTeethRecords] = useState([]);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatientData = async () => {
      setLoading(true);
      try {
        // Try fetching from API by patient ID
        const patientRes = await fetchWithAuth(`${API_BASE}/api/patients/${id}`);
        if (patientRes.ok) {
          const patientData = await patientRes.json();
          setPatient({
            id: patientData.id,
            name: `${patientData.firstName} ${patientData.lastName}`,
            lastVisit: patientData.updatedAt ? new Date(patientData.updatedAt).toLocaleDateString() : 'N/A',
          });

          // Fetch teeth data
          const teethRes = await fetchWithAuth(`${API_BASE}/api/teeth/patient/${patientData.id}`);
          if (teethRes.ok) {
            const records = await teethRes.json();
            setTeethRecords(records);
            // Build teeth status map
            const teeth = {};
            records.forEach(r => {
              teeth[r.toothNumber] = r.status.toLowerCase();
            });
            setTeethData(teeth);
          }
        } else {
          // Fallback to local data
          const localPatient = getPatientById(id);
          if (localPatient) {
            setPatient({
              id: localPatient.id,
              name: `${localPatient.firstName} ${localPatient.lastName}`,
              lastVisit: localPatient.updatedAt ? new Date(localPatient.updatedAt).toLocaleDateString() : 'N/A',
            });
          }
        }
      } catch (e) {
        // Fallback to local data
        const localPatient = getPatientById(id);
        if (localPatient) {
          setPatient({
            id: localPatient.id,
            name: `${localPatient.firstName} ${localPatient.lastName}`,
            lastVisit: 'N/A',
          });
        }
      }
      setLoading(false);
    };

    fetchPatientData();
  }, [id]);

  if (loading) {
    return (
      <div className={styles.container}>
        <p>Se încarcă datele pacientului...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className={styles.container}>
        <h2>Pacientul nu a fost găsit</h2>
        <Link to="/appointments" className="btn btn-outline" style={{marginTop: '1rem'}}>
          <ArrowLeft size={16} /> Înapoi la Programări
        </Link>
      </div>
    );
  }

  const getToothClass = (num) => {
    const status = teethData[num] || 'healthy';
    return `${styles.toothDot} ${styles[status]}`;
  };

  const handleToothClick = (num) => {
    setSelectedTooth(num);
  };

  const toothStatus = selectedTooth ? (teethData[selectedTooth] || 'healthy') : 'healthy';
  const selectedRecord = selectedTooth ? teethRecords.find(r => r.toothNumber === selectedTooth) : null;
  const toothNotes = selectedRecord?.notes || '';
  const toothHistory = selectedRecord?.history || [];
  const notesLength = toothNotes.length;

  return (
    <div className={styles.container}>
      <Link to="/appointments" className={styles.backBtn}>
        <ArrowLeft size={16} /> Înapoi la Programări
      </Link>
      
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Cartografiere Dentară Interactivă</h1>
          <p className={styles.subtitle}>Vizualizare avansată 2D/3D a dentiției complete cu urmărire a stării în timp real</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.patientInfo}>
            <h2>Pacient: {patient.name}</h2>
            <p>ID Pacient: #{patient.id} | Ultima Vizită: {patient.lastVisit}</p>
          </div>
          
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <div className={`${styles.swatch} ${styles.healthy}`}></div> Sănătos
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.swatch} ${styles.watch}`}></div> Sub Observație
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.swatch} ${styles.critical}`}></div> Critic
            </div>
          </div>
        </div>

        <div className={styles.mappingArea}>
          <div className={styles.dentalChartWrapper}>
            {Object.keys(TOOTH_POSITIONS).map((numStr) => {
              const num = parseInt(numStr);
              return (
                <button 
                  key={num}
                  className={getToothClass(num)}
                  style={{ left: TOOTH_POSITIONS[num].left, top: TOOTH_POSITIONS[num].top }}
                  onClick={() => handleToothClick(num)}
                  title={TOOTH_NAMES[num]}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tooth Modal Popup */}
      {selectedTooth && (
        <Modal 
          isOpen={!!selectedTooth} 
          onClose={() => setSelectedTooth(null)} 
          title={
            <span className={styles.toothModalHeader}>
              <span className={`${styles.toothBadge} ${styles[toothStatus]}`}>{selectedTooth}</span>
              <span className={styles.toothTitleText}>
                <span>{TOOTH_NAMES[selectedTooth]}</span>
                <small>Dinte #{selectedTooth}</small>
              </span>
            </span>
          }
        >
          <div className={styles.toothModalContent}>
            <div className={styles.toothStatusRow}>
              <Badge type={toothStatus === 'healthy' ? 'success' : (toothStatus === 'watch' ? 'warning' : 'danger')}>
                {(STATUS_MAP[toothStatus] || toothStatus).toUpperCase()}
              </Badge>
              <span className={styles.lastVisit}><Clock size={15}/> Ultima Vizită: {patient.lastVisit}</span>
            </div>
            
            <div className={styles.historySection}>
              <div className={styles.sectionTitle}><FileText size={18}/> Istoric Tratamente</div>
              <div className={styles.historyBox}>
                <ul>
                  {toothHistory.length > 0 ? (
                    toothHistory.map((h, i) => (
                      <li key={i}>
                        {h.procedure} - {new Date(h.date).toLocaleDateString()}
                        {h.doctor && ` (Dr. ${h.doctor.lastName})`}
                      </li>
                    ))
                  ) : (
                    <li>Niciun tratament înregistrat</li>
                  )}
                </ul>
              </div>
            </div>

            <div className={styles.notesSection}>
              <div className={styles.sectionTitle}>
                <User size={18}/> Anotări Medic 
                {!isPatient && <span>(Max 500 caractere)</span>}
              </div>
              {isPatient ? (
                <div className={styles.readOnlyNotes} style={{ padding: '10px', backgroundColor: 'var(--surface-color)', borderRadius: '8px', minHeight: '60px', marginTop: '10px' }}>
                  {toothNotes ? toothNotes : <span style={{ color: '#888', fontStyle: 'italic' }}>Nu există notițe înregistrate pentru acest dinte.</span>}
                </div>
              ) : (
                <>
                  <textarea 
                    className={styles.notesArea} 
                    placeholder="Adaugă notițe..." 
                    defaultValue={toothNotes}
                  />
                  <span className={styles.characterCount}>{notesLength} / 500 caractere</span>
                </>
              )}
            </div>
            
            <div className={styles.toothActions}>
              {!isPatient && <button className="btn btn-primary" onClick={() => setSelectedTooth(null)}>Adaugă Tratament</button>}
              <button className="btn btn-outline" onClick={() => setSelectedTooth(null)}>Vezi Radiografii</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
