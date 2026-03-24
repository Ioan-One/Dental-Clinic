import { Calendar, PlayCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Îngrijire Pacienți de Ultimă Generație & Cartografiere Dentară Interactivă
          </h1>
          <p className={styles.subtitle}>
            Înregistrări digitale securizate, conforme cu HIPAA, cu programare în timp real și suprapuneri avansate de diagnosticare 3D a dinților.
          </p>
          
          <div className={styles.ctaGroup}>
            <Link to="/appointments">
              <button className="btn btn-primary">
                <Calendar size={20} />
                Fă o Programare
              </button>
            </Link>
            <button className={`${styles.outlineBtn}`}>
              <PlayCircle size={20} />
              Programează un Demo
            </button>
          </div>
          
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>10K+</span>
              <span className={styles.statLabel}>Pacienți Activi</span>
            </div>
            <div className={styles.divider}></div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>500+</span>
              <span className={styles.statLabel}>Medici</span>
            </div>
            <div className={styles.divider}></div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>99.9%</span>
              <span className={styles.statLabel}>Timp de funcționare</span>
            </div>
          </div>
        </div>
        
        <div className={styles.heroImageContainer}>
          <div className={styles.imageWrapper}>
            {/* Placeholder for the clinic image */}
            <div className={styles.imagePlaceholder}>
              <div className={styles.hipaaBadge}>
                <div className={styles.badgeIcon}><ShieldCheck size={24} color="white" /></div>
                <div className={styles.badgeText}>
                  <strong>Conform HIPAA</strong>
                  <span>Criptat AES-256</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.featuresHeader}>
          <h2>Management Complet al Clinicii</h2>
          <p>Tot ce aveți nevoie pentru a gestiona o clinică dentară modernă cu securitate și eficiență la nivel corporativ</p>
        </div>
        
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
             <div className={styles.cardImagePlaceholder1}></div>
            <div className={styles.cardContent}>
              <div className={styles.cardIcon}></div>
              <h3>Cartografiere Dentară Interactivă</h3>
              <p>Interfață grafică 2D/3D a mandibulei umane cu dinți pe care se poate face clic pentru pop-up-uri detaliate de stare.</p>
            </div>
          </div>
          
          <div className={styles.featureCard}>
             <div className={styles.cardImagePlaceholder2}></div>
            <div className={styles.cardContent}>
              <div className={styles.cardIcon}></div>
              <h3>Programare Inteligentă</h3>
              <p>Managementul intervalelor cu Soft-Lock previne rezervările duble cu notificări SMS automate prin integrare Twilio.</p>
            </div>
          </div>
          
          <div className={styles.featureCard}>
             <div className={styles.cardImagePlaceholder3}></div>
            <div className={styles.cardContent}>
              <div className={styles.cardIcon}></div>
              <h3>Fișiere Securizate ale Pacienților</h3>
              <p>Criptare AES-256 cu optimizare a imaginilor DICOM/raze X și stocare conformă cu HIPAA pentru conformitate legală.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
