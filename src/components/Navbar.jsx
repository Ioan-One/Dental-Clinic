import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <header className={styles.navbar}>
      <Link to="/" className={styles.logo}>
        <Shield className={styles.icon} size={28} />
        <span className={styles.brand}>DentalCare Pro</span>
      </Link>
      
      <nav className={styles.navLinks}>
        <a href="#cum-functioneaza">Cum funcționează</a>
        <a href="#pentru-medici">Pentru Medici</a>
        <a href="#pentru-pacienti">Pentru Pacienți</a>
        <Link to="/appointments" className={styles.appointmentLink}>Programări</Link>
      </nav>
      
      <div className={styles.actions}>
        <button className="btn btn-primary">Autentificare / Înregistrare</button>
      </div>
    </header>
  );
}
