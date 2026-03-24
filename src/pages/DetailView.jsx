import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, FileText, User } from 'lucide-react';
import { useData } from '../store/DataStore';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import styles from './DetailView.module.css';

const TOOTH_NAMES = {
  1: 'Molar de Minte (M3)', 2: 'Molarul 2 (M2)', 3: 'Molarul 1 (M1)', 4: 'Premolarul 2 (P2)', 5: 'Premolarul 1 (P1)', 6: 'Canin (C)', 7: 'Incisiv Lateral (IL)', 8: 'Incisiv Central (IC)',
  9: 'Incisiv Central (IC)', 10: 'Incisiv Lateral (IL)', 11: 'Canin (C)', 12: 'Premolarul 1 (P1)', 13: 'Premolarul 2 (P2)', 14: 'Molarul 1 (M1)', 15: 'Molarul 2 (M2)', 16: 'Molar de Minte (M3)',
  17: 'Molar de Minte (M3)', 18: 'Molarul 2 (M2)', 19: 'Molarul 1 (M1)', 20: 'Premolarul 2 (P2)', 21: 'Premolarul 1 (P1)', 22: 'Canin (C)', 23: 'Incisiv Lateral (IL)', 24: 'Incisiv Central (IC)',
  25: 'Incisiv Central (IC)', 26: 'Incisiv Lateral (IL)', 27: 'Canin (C)', 28: 'Premolarul 1 (P1)', 29: 'Premolarul 2 (P2)', 30: 'Molarul 1 (M1)', 31: 'Molarul 2 (M2)', 32: 'Molar de Minte (M3)'
};

const STATUS_MAP = {
  healthy: 'Sănătos',
  watch: 'Sub Observație',
  critical: 'Critic'
};

const TOOTH_NOTES = {
  healthy: 'Dintele este perfect sănătos. Fără semne de carie sau degradare vizibilă.',
  watch: 'Atenție: Observați o mică demineralizare pe suprafața ocluzală. De urmărit la următoarea vizită.',
  critical: 'Caries profundă care necesită tratament de canal urgent. Posibilă infecție la rădăcină.'
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
  const patient = getPatientById(id);
  const [selectedTooth, setSelectedTooth] = useState(null);

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
    const status = patient.teeth[num] || 'healthy';
    return `${styles.toothDot} ${styles[status]}`;
  };

  const handleToothClick = (num) => {
    setSelectedTooth(num);
  };

  const toothStatus = selectedTooth ? (patient.teeth[selectedTooth] || 'healthy') : 'healthy';
  const notesLength = TOOTH_NOTES[toothStatus].length;

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
                {STATUS_MAP[toothStatus].toUpperCase()}
              </Badge>
              <span className={styles.lastVisit}><Clock size={15}/> Ultima Vizită: {patient.lastVisit}</span>
            </div>
            
            <div className={styles.historySection}>
              <div className={styles.sectionTitle}><FileText size={18}/> Istoric Tratamente</div>
              <div className={styles.historyBox}>
                <ul>
                  <li>Control de Rutină - {patient.lastVisit}</li>
                </ul>
              </div>
            </div>

            <div className={styles.notesSection}>
              <div className={styles.sectionTitle}><User size={18}/> Anotări Medic <span>(Max 500 caractere)</span></div>
              <textarea 
                className={styles.notesArea} 
                placeholder="Adaugă notițe..." 
                defaultValue={TOOTH_NOTES[toothStatus]}
              />
              <span className={styles.characterCount}>{notesLength} / 500 caractere</span>
            </div>
            
            <div className={styles.toothActions}>
              <button className="btn btn-primary" onClick={() => setSelectedTooth(null)}>Adaugă Tratament</button>
              <button className="btn btn-outline" onClick={() => setSelectedTooth(null)}>Vezi Radiografii</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
