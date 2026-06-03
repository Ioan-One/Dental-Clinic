import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Stethoscope, Info } from 'lucide-react';
import { useData } from '../store/DataStore';
import { useAuth } from '../store/AuthContext';
import Badge from '../components/Badge';
import styles from './CalendarView.module.css';

// ── helpers ────────────────────────────────────────────────────────

const SLOT_START = 8;
const SLOT_END = 18;
const SLOT_STEP = 30;

const ALL_SLOTS = (() => {
  const slots = [];
  for (let h = SLOT_START; h < SLOT_END; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (SLOT_STEP === 30) slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
})();

const fmt = (d) => {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const dayLabels = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin'];
const dayLabelsFull = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri'];
const monthNames = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekDays(monday) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

const STATUS_LABELS = {
  confirmed: 'Confirmat',
  pending: 'În așteptare',
  completed: 'Finalizat',
  cancelled: 'Anulat',
};

// ── component ─────────────────────────────────────────────────────

export default function CalendarView() {
  const { doctors, fetchDoctorAppointments } = useData();
  const { user } = useAuth();

  const isDoctor = user?.role === 'doctor';
  const defaultDoctorId = isDoctor ? user.doctorId : (doctors[0]?.id || '');

  const [selectedDoctorId, setSelectedDoctorId] = useState(defaultDoctorId);
  const [view, setView] = useState('week');
  const [currentDate, setCurrentDate] = useState(() => getMonday(new Date()));
  const [calendarAppts, setCalendarAppts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popover, setPopover] = useState(null);
  const [now, setNow] = useState(new Date());

  const weekGridRef = useRef(null);

  // Live clock — updates every minute for the time indicator
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Which 30-min slot the current time falls in (null if outside work hours)
  const currentSlot = useMemo(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    if (h < SLOT_START || h >= SLOT_END) return null;
    return `${String(h).padStart(2, '0')}:${m < 30 ? '00' : '30'}`;
  }, [now]);

  // How far into the current slot the clock is (0-100%)
  const nowOffsetPct = Math.round((now.getMinutes() % 30) / 30 * 100);

  // Keep selectedDoctorId in sync when doctors load
  useEffect(() => {
    if (!selectedDoctorId && doctors.length) {
      setSelectedDoctorId(isDoctor ? user.doctorId : doctors[0]?.id);
    }
  }, [doctors, selectedDoctorId, isDoctor, user]);

  // Date range for the current view
  const { dateFrom, dateTo } = useMemo(() => {
    if (view === 'week') {
      const mon = getMonday(currentDate);
      const fri = new Date(mon);
      fri.setDate(fri.getDate() + 4);
      return { dateFrom: fmt(mon), dateTo: fmt(fri) };
    }
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    return {
      dateFrom: fmt(new Date(y, m, 1)),
      dateTo: fmt(new Date(y, m + 1, 0)),
    };
  }, [currentDate, view]);

  // Fetch appointments for the view range
  useEffect(() => {
    if (!selectedDoctorId) return;
    setLoading(true);
    fetchDoctorAppointments(selectedDoctorId, dateFrom, dateTo)
      .then(data => setCalendarAppts(data))
      .finally(() => setLoading(false));
  }, [selectedDoctorId, dateFrom, dateTo, fetchDoctorAppointments]);

  const navigate = useCallback((dir) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (view === 'week') d.setDate(d.getDate() + dir * 7);
      else d.setMonth(d.getMonth() + dir);
      return d;
    });
    setPopover(null);
  }, [view]);

  // Fixed: goToday respects the current view mode
  const goToday = () => {
    const today = new Date();
    setCurrentDate(
      view === 'week'
        ? getMonday(today)
        : new Date(today.getFullYear(), today.getMonth(), 1)
    );
    setPopover(null);
  };

  // Auto-scroll week grid to show current time on view entry
  useEffect(() => {
    if (view !== 'week' || !weekGridRef.current || !currentSlot) return;
    const weekDaysNow = getWeekDays(getMonday(currentDate));
    const isCurrentWeek = weekDaysNow.some(d => fmt(d) === fmt(new Date()));
    if (!isCurrentWeek) return;
    const idx = ALL_SLOTS.indexOf(currentSlot);
    if (idx < 0) return;
    const SLOT_H = 32;
    const HEADER_H = 54;
    weekGridRef.current.scrollTop = Math.max(0, HEADER_H + idx * SLOT_H - 120);
  }, [view, currentDate, currentSlot]);

  // Group appointments by date
  const aptsByDate = useMemo(() => {
    const map = {};
    calendarAppts.forEach(apt => {
      if (!map[apt.date]) map[apt.date] = [];
      map[apt.date].push(apt);
    });
    return map;
  }, [calendarAppts]);

  const weekDays = useMemo(() => getWeekDays(getMonday(currentDate)), [currentDate]);

  const headerText = useMemo(() => {
    if (view === 'week') {
      const mon = weekDays[0];
      const fri = weekDays[4];
      if (mon.getMonth() === fri.getMonth()) {
        return `${mon.getDate()} – ${fri.getDate()} ${monthNames[mon.getMonth()]} ${mon.getFullYear()}`;
      }
      return `${mon.getDate()} ${monthNames[mon.getMonth()]} – ${fri.getDate()} ${monthNames[fri.getMonth()]} ${fri.getFullYear()}`;
    }
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, view, weekDays]);

  // Clamp popover to viewport so it never appears off-screen
  const handleAptClick = (apt, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const POP_W = 260;
    const POP_H = 185;
    let x = rect.left + rect.width / 2;
    let y = rect.bottom + 8;
    x = Math.max(POP_W / 2 + 8, Math.min(x, window.innerWidth - POP_W / 2 - 8));
    if (y + POP_H > window.innerHeight - 16) y = rect.top - POP_H - 8;
    setPopover({ apt, x, y });
  };

  const closePopover = () => setPopover(null);

  const selectedDoctor = doctors.find(d => d.id === parseInt(selectedDoctorId));
  const todayStr = fmt(new Date());

  // ── Render ──────────────────────────────────────

  return (
    <div className={styles.container} onClick={closePopover}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <CalendarIcon size={28} />
            {isDoctor ? 'Calendarul Meu' : 'Calendar Programări'}
          </h1>
          <p className={styles.subtitle}>
            {isDoctor
              ? 'Vizualizează programările tale pe calendar'
              : 'Vizualizează programările pe calendar'}
          </p>
        </div>

        {/* Doctor selector (admin/assistant only) */}
        {!isDoctor && doctors.length > 0 && (
          <div className={styles.doctorSelect}>
            <Stethoscope size={16} />
            <select
              value={selectedDoctorId}
              onChange={e => { setSelectedDoctorId(parseInt(e.target.value)); setPopover(null); }}
            >
              {doctors.map(d => (
                <option key={d.id} value={d.id}>Dr. {d.lastName} {d.firstName} — {d.specialization}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.navGroup}>
          <button className={styles.navBtn} onClick={() => navigate(-1)} title="Înapoi">
            <ChevronLeft size={20} />
          </button>
          <button className={styles.todayBtn} onClick={goToday}>Astăzi</button>
          <button className={styles.navBtn} onClick={() => navigate(1)} title="Înainte">
            <ChevronRight size={20} />
          </button>
          <span className={styles.rangeLabel}>{headerText}</span>
        </div>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === 'week' ? styles.viewBtnActive : ''}`}
            onClick={() => { setView('week'); setPopover(null); }}
          >
            Săptămână
          </button>
          <button
            className={`${styles.viewBtn} ${view === 'month' ? styles.viewBtnActive : ''}`}
            onClick={() => { setView('month'); setPopover(null); }}
          >
            Lună
          </button>
        </div>
      </div>

      {/* Doctor info banner */}
      {selectedDoctor && (
        <div className={styles.doctorBanner}>
          <Stethoscope size={18} />
          <span>Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}</span>
          <span className={styles.spec}>— {selectedDoctor.specialization}</span>
        </div>
      )}

      {loading && <div className={styles.loadingBar} />}

      {/* ── WEEK VIEW ── */}
      {view === 'week' && (
        <div className={styles.weekGridWrapper} ref={weekGridRef}>
          <div className={styles.weekGrid}>
            {/* Sticky corner + day headers */}
            <div className={styles.cornerCell} />
            {weekDays.map((day, i) => {
              const isToday = fmt(day) === todayStr;
              return (
                <div key={i} className={`${styles.dayHeader} ${isToday ? styles.dayHeaderToday : ''}`}>
                  <span className={styles.dayLabel}>{dayLabels[i]}</span>
                  <span className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : ''}`}>
                    {day.getDate()}
                  </span>
                </div>
              );
            })}

            {/* Time rows */}
            {ALL_SLOTS.map((slot, si) => (
              <React.Fragment key={slot}>
                <div className={styles.timeCell}>
                  {slot.endsWith(':00') && <span className={styles.timeLabel}>{slot}</span>}
                </div>
                {weekDays.map((day, di) => {
                  const dateStr = fmt(day);
                  const aptsInSlot = (aptsByDate[dateStr] || []).filter(a => a.time === slot);
                  const isPast = new Date(dateStr + 'T' + slot) < now;
                  const isNowCell = dateStr === todayStr && slot === currentSlot;
                  return (
                    <div
                      key={`${si}-${di}`}
                      className={`${styles.slotCell} ${isPast ? styles.slotPast : ''} ${slot.endsWith(':00') ? styles.slotHour : ''}`}
                    >
                      {isNowCell && (
                        <div className={styles.timeNow} style={{ top: `${nowOffsetPct}%` }} />
                      )}
                      {aptsInSlot.map(apt => (
                        <div
                          key={apt.id}
                          className={`${styles.aptBlock} ${styles['apt_' + apt.status]}`}
                          onClick={(e) => handleAptClick(apt, e)}
                          title={`${apt.patientName} — ${apt.type}`}
                        >
                          <span className={styles.aptTime}>{apt.time}</span>
                          <span className={styles.aptLabel}>{apt.patientName}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* ── MONTH VIEW ── */}
      {view === 'month' && (
        <div className={styles.monthGrid}>
          {dayLabelsFull.map(label => (
            <div key={label} className={styles.monthDayHeader}>{label}</div>
          ))}
          {(() => {
            const y = currentDate.getFullYear();
            const m = currentDate.getMonth();
            const days = getMonthDays(y, m);

            // Leading empty cells for the Mon-Fri 5-col grid.
            // Sun(0)→0, Mon(1)→0, Tue(2)→1, Wed(3)→2, Thu(4)→3, Fri(5)→4, Sat(6)→5
            const firstDayDow = days[0].getDay();
            const firstDow = firstDayDow === 0 ? 0 : firstDayDow - 1;

            const cells = [];
            for (let i = 0; i < firstDow; i++) cells.push(null);
            days.forEach(d => {
              const dow = d.getDay();
              if (dow >= 1 && dow <= 5) cells.push(d);
            });
            while (cells.length % 5 !== 0) cells.push(null);

            return cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className={styles.monthCellEmpty} />;
              const dateStr = fmt(day);
              const dayApts = aptsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              return (
                <div key={dateStr} className={`${styles.monthCell} ${isToday ? styles.monthCellToday : ''}`}>
                  <span className={`${styles.monthDate} ${isToday ? styles.monthDateToday : ''}`}>
                    {day.getDate()}
                  </span>
                  <div className={styles.monthApts}>
                    {dayApts.slice(0, 4).map(apt => (
                      <div
                        key={apt.id}
                        className={`${styles.monthAptDot} ${styles['apt_' + apt.status]}`}
                        onClick={(e) => handleAptClick(apt, e)}
                        title={`${apt.time} — ${apt.patientName}`}
                      >
                        <span>{apt.time}</span>
                        <span>{apt.patientName?.split(' ')[0]}</span>
                      </div>
                    ))}
                    {dayApts.length > 4 && (
                      <span className={styles.monthMore}>+{dayApts.length - 4} mai multe</span>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ── POPOVER ── */}
      {popover && (
        <div
          className={styles.popover}
          style={{ left: popover.x, top: popover.y }}
          onClick={e => e.stopPropagation()}
        >
          <div className={styles.popoverHeader}>
            <Info size={14} />
            <strong>Detalii Programare</strong>
          </div>
          <div className={styles.popoverBody}>
            <div className={styles.popoverRow}>
              <User size={14} /> <span>{popover.apt.patientName}</span>
            </div>
            <div className={styles.popoverRow}>
              <Clock size={14} /> <span>{popover.apt.date} la {popover.apt.time}</span>
            </div>
            <div className={styles.popoverRow}>
              <CalendarIcon size={14} /> <span>{popover.apt.type}</span>
            </div>
            <div className={styles.popoverRow}>
              <Badge type={popover.apt.status}>
                {STATUS_LABELS[popover.apt.status] || popover.apt.status}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
