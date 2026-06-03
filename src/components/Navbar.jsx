import { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LogOut, User, CalendarDays, Smile, LayoutDashboard, Users, Calendar, Menu, X } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import styles from './Navbar.module.css';

const ROLE_LABELS = {
  admin:     'Admin',
  doctor:    'Medic',
  assistant: 'Asistent',
  patient:   'Pacient',
};

const ROLE_BADGE_CLASS = {
  admin:     'badgeAdmin',
  doctor:    'badgeDoctor',
  assistant: 'badgeAssistant',
  patient:   'badgePatient',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const closeMenu = () => setMenuOpen(false);

  const navLinkClass = ({ isActive }) =>
    `${styles.navItem} ${isActive ? styles.navItemActive : ''}`;

  // Links shown in the centre of the navbar
  let centreLinks = null;

  if (!user) {
    // Only meaningful on the landing page
    centreLinks = isLanding ? (
      <>
        <a href="#cum-functioneaza" className={styles.navItem}>Cum funcționează</a>
        <a href="#pentru-medici"    className={styles.navItem}>Pentru Medici</a>
        <a href="#pentru-pacienti"  className={styles.navItem}>Pentru Pacienți</a>
      </>
    ) : null;
  } else if (user.role === 'patient') {
    centreLinks = (
      <>
        <NavLink to="/appointments" className={navLinkClass}>
          <CalendarDays size={15} /> Programările Mele
        </NavLink>
        {user.patientId && (
          <NavLink to={`/patient/${user.patientId}`} className={navLinkClass}>
            <Smile size={15} /> Mapa Dinților
          </NavLink>
        )}
      </>
    );
  } else if (user.role === 'doctor') {
    centreLinks = (
      <>
        <NavLink to="/appointments" className={navLinkClass}>
          <CalendarDays size={15} /> Agenda Mea
        </NavLink>
        <NavLink to="/calendar" className={navLinkClass}>
          <Calendar size={15} /> Calendar
        </NavLink>
      </>
    );
  } else if (user.role === 'admin') {
    centreLinks = (
      <>
        <NavLink to="/appointments" className={navLinkClass}>
          <LayoutDashboard size={15} /> Programări
        </NavLink>
        <NavLink to="/calendar" className={navLinkClass}>
          <Calendar size={15} /> Calendar
        </NavLink>
        <NavLink to="/admin/users" className={navLinkClass}>
          <Users size={15} /> Conturi
        </NavLink>
      </>
    );
  } else {
    // assistant
    centreLinks = (
      <>
        <NavLink to="/appointments" className={navLinkClass}>
          <LayoutDashboard size={15} /> Programări
        </NavLink>
        <NavLink to="/calendar" className={navLinkClass}>
          <Calendar size={15} /> Calendar
        </NavLink>
      </>
    );
  }

  return (
    <header className={styles.navbar}>
      <Link to={user ? '/appointments' : '/'} className={styles.logo}>
        <Shield className={styles.icon} size={26} />
        <span className={styles.brand}>DentalCare Pro</span>
      </Link>

      <nav className={styles.navLinks}>
        {centreLinks}
      </nav>

      {/* Mobile: hamburger button */}
      <div className={styles.mobileNav}>
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Meniu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className={styles.drawer} onClick={closeMenu}>
          <div className={styles.drawerInner} onClick={e => e.stopPropagation()}>
            {user ? (
              <>
                <div className={styles.drawerUser}>
                  <User size={16} />
                  <span>{user.firstName} {user.lastName}</span>
                  <span className={`${styles.roleBadge} ${styles[ROLE_BADGE_CLASS[user.role] ?? 'badgePatient']}`}>
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </div>
                <nav className={styles.drawerLinks} onClick={closeMenu}>
                  {centreLinks}
                </nav>
                <button className={`btn ${styles.logoutBtn} ${styles.drawerLogout}`} onClick={handleLogout}>
                  <LogOut size={15} /> Ieșire
                </button>
              </>
            ) : (
              <nav className={styles.drawerLinks} onClick={closeMenu}>
                <Link to="/login" className={styles.navItem}>Autentificare</Link>
                <Link to="/register" className={styles.navItem}>Înregistrare</Link>
              </nav>
            )}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        {user ? (
          <div className={styles.userMenu}>
            <div className={styles.userInfo}>
              <User size={15} />
              <span className={styles.userName}>{user.firstName} {user.lastName}</span>
              <span className={`${styles.roleBadge} ${styles[ROLE_BADGE_CLASS[user.role] ?? 'badgePatient']}`}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>
            <button className={`btn ${styles.logoutBtn}`} onClick={handleLogout}>
              <LogOut size={15} />
              <span>Ieșire</span>
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary">
            Autentificare / Înregistrare
          </Link>
        )}
      </div>
    </header>
  );
}
