import { Link } from 'react-router-dom';
import {
  Calendar, Shield, Clock, Phone, MapPin,
  Star, CheckCircle, Smile, Heart, Zap,
  ChevronRight, Sparkles, Users, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import styles from './LandingPage.module.css';

const SERVICES = [
  { icon: Smile,    title: 'Control de Rutină',      desc: 'Examinare completă, radiografii și plan de tratament personalizat.' },
  { icon: Sparkles, title: 'Albire Profesională',    desc: 'Albire dentară sigură cu rezultate vizibile după prima ședință.' },
  { icon: Heart,    title: 'Igienizare & Detartraj', desc: 'Curățare profesională pentru gingii sănătoase și respirație proaspătă.' },
  { icon: Shield,   title: 'Obturații & Tratamente', desc: 'Restaurări estetice cu materiale de ultimă generație, fără durere.' },
  { icon: Zap,      title: 'Ortodonție',             desc: 'Aparate dentare fixe sau invizibile pentru un zâmbet perfect aliniat.' },
  { icon: Users,    title: 'Implantologie',          desc: 'Implanturi dentare de înaltă calitate cu durată de viață îndelungată.' },
];

const STEPS = [
  { num: '01', title: 'Creează-ți Contul',  desc: 'Înregistrare rapidă cu email și parolă. Datele tale sunt criptate și protejate.' },
  { num: '02', title: 'Alege Programarea',  desc: 'Selectează medicul, serviciul și intervalul orar care ți se potrivește.' },
  { num: '03', title: 'Vino la Clinică',    desc: 'Primești confirmare instantă și reminder înainte de programare.' },
];

const REVIEWS = [
  { name: 'Andrei M.', stars: 5, text: 'Cea mai bună experiență dentară pe care am avut-o. Personal prietenos, tehnologie modernă și fără durere!' },
  { name: 'Maria P.',  stars: 5, text: 'Am venit cu teama de stomatolog și am plecat zâmbind. Recomand cu căldură!' },
  { name: 'Ioan D.',   stars: 5, text: 'Programarea online este super convenabilă. Am găsit slot chiar în aceeași zi.' },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className={styles.page}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            <CheckCircle size={14} />
            <span>Clinică acreditată · Peste 8 ani de experiență</span>
          </div>

          <h1 className={styles.heroTitle}>
            Zâmbetul Tău,<br />
            <span className={styles.heroAccent}>Prioritatea Noastră</span>
          </h1>

          <p className={styles.heroSub}>
            Îngrijire dentară modernă, într-un mediu prietenos și relaxant.
            Programează-te online în câteva secunde.
          </p>

          <div className={styles.heroCta}>
            {user ? (
              <Link
                to={user.role === 'patient' && user.patientId ? `/patient/${user.patientId}` : '/appointments'}
                className={styles.ctaPrimary}
              >
                <Calendar size={18} />
                {user.role === 'patient' ? 'Dosarul Meu' : 'Programări'}
              </Link>
            ) : (
              <>
                <Link to="/register" className={styles.ctaPrimary}>
                  <Calendar size={18} />
                  Programează-te Acum
                </Link>
                <Link to="/login" className={styles.ctaSecondary}>
                  Am deja cont
                  <ChevronRight size={16} />
                </Link>
              </>
            )}
          </div>

          <div className={styles.heroStats}>
            {[['98%', 'Pacienți Mulțumiți'], ['15+', 'Medici Specialiști'], ['8 ani', 'Experiență'], ['24/7', 'Suport Online']].map(([n, l]) => (
              <div key={l} className={styles.stat}>
                <span className={styles.statNum}>{n}</span>
                <span className={styles.statLbl}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.heroCard}>
            <div className={styles.heroCardTop}>
              <div className={styles.hcAvatar}>
                <Smile size={28} color="#2563eb" />
              </div>
              <div>
                <div className={styles.hcName}>Dr. Elena Ionescu</div>
                <div className={styles.hcSpec}>Ortodonție · Stomatologie Generală</div>
              </div>
            </div>
            <div className={styles.hcSlots}>
              <div className={styles.hcSlotsLabel}>Sloturi disponibile azi</div>
              <div className={styles.hcSlotsRow}>
                {['09:00', '10:30', '14:00', '16:00'].map(t => (
                  <span key={t} className={styles.slot}>{t}</span>
                ))}
              </div>
            </div>
            <div className={styles.hcConfirm}>
              <CheckCircle size={14} color="#10b981" />
              <span>Confirmare instantă prin email</span>
            </div>
          </div>

          <div className={styles.floatBadge1}>
            <Star size={14} fill="#f59e0b" color="#f59e0b" />
            <strong>4.9</strong>
            <span>rating mediu</span>
          </div>
          <div className={styles.floatBadge2}>
            <Shield size={14} color="#2563eb" />
            <span>Date criptate AES-256</span>
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────── */}
      <section className={styles.section} id="servicii">
        <div className={styles.sectionHead}>
          <span className={styles.pill}>Servicii</span>
          <h2>Tot ce ai nevoie pentru un zâmbet sănătos</h2>
          <p>Oferim o gamă completă de servicii stomatologice, folosind echipamente de ultimă generație.</p>
        </div>

        <div className={styles.serviceGrid}>
          {SERVICES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className={styles.serviceCard}>
              <div className={styles.serviceIcon}>
                <Icon size={22} color="#2563eb" />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
              <Link to={user ? '/appointments' : '/register'} className={styles.serviceLink}>
                Programează <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className={styles.sectionAlt} id="cum-functioneaza">
        <div className={styles.sectionHead}>
          <span className={styles.pill}>Simplu & Rapid</span>
          <h2>Programare în 3 pași simpli</h2>
          <p>Fără telefoane, fără așteptare. Gestionează totul online, oricând.</p>
        </div>

        <div className={styles.steps}>
          {STEPS.map(({ num, title, desc }) => (
            <div key={num} className={styles.step}>
              <div className={styles.stepNum}>{num}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>

        <div className={styles.stepsCta}>
          <Link to={user ? '/appointments' : '/register'} className={styles.ctaPrimary}>
            Începe Acum <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Reviews ──────────────────────────────────────────── */}
      <section className={styles.section} id="recenzii">
        <div className={styles.sectionHead}>
          <span className={styles.pill}>Recenzii Pacienți</span>
          <h2>Ce spun pacienții noștri</h2>
        </div>

        <div className={styles.reviewGrid}>
          {REVIEWS.map(({ name, stars, text }) => (
            <div key={name} className={styles.reviewCard}>
              <div className={styles.reviewStars}>
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p className={styles.reviewText}>"{text}"</p>
              <div className={styles.reviewAuthor}>
                <div className={styles.reviewAvatar}>{name[0]}</div>
                <strong>{name}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────── */}
      <section className={styles.contactSection} id="contact">
        <div className={styles.contactGrid}>
          <div className={styles.contactInfo}>
            <span className={styles.pill}>Contact</span>
            <h2>Suntem aici pentru tine</h2>
            <div className={styles.contactItems}>
              <div className={styles.contactItem}>
                <MapPin size={18} color="#2563eb" />
                <span>Str. Mihai Eminescu 45, Cluj-Napoca</span>
              </div>
              <div className={styles.contactItem}>
                <Phone size={18} color="#2563eb" />
                <span>+40 264 123 456</span>
              </div>
              <div className={styles.contactItem}>
                <Clock size={18} color="#2563eb" />
                <div>
                  <div>Luni – Vineri: 08:00 – 18:00</div>
                  <div>Sâmbătă: 09:00 – 14:00</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.contactCta}>
            <h3>Gata să zâmbești?</h3>
            <p>Rezervă-ți programarea acum și beneficiezi de consultație gratuită la prima vizită.</p>
            <Link to={user ? '/appointments' : '/register'} className={styles.ctaPrimary}>
              <Calendar size={18} />
              Programează Consultație Gratuită
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>© 2026 DentalCare Pro · Toate drepturile rezervate</span>
          <span>Clinică autorizată · Date protejate conform GDPR</span>
        </div>
      </footer>
    </div>
  );
}
