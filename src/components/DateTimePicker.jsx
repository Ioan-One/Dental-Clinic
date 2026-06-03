import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useData } from '../store/DataStore';
import styles from './DateTimePicker.module.css';

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

const monthNames = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];
const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Helper to format date as YYYY-MM-DD
const fmt = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export default function DateTimePicker({ doctorId, value, onChange }) {
  const { fetchDoctorSlots } = useData();
  
  // Base the visible calendar month on the currently selected date, or today
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value?.date) return new Date(value.date);
    return new Date();
  });
  
  const [bookedSlotsMap, setBookedSlotsMap] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch slots for the current month
  useEffect(() => {
    if (!doctorId) return;

    let isMounted = true;
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);

    const dateFrom = fmt(firstDay);
    const dateTo = fmt(lastDay);

    setLoading(true);
    fetchDoctorSlots(doctorId, dateFrom, dateTo)
      .then(res => {
        if (isMounted) {
          setBookedSlotsMap(res.bookedSlots || {});
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [doctorId, currentMonth, fetchDoctorSlots]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateClick = (dateObj) => {
    if (!dateObj || isPast(dateObj)) return;
    const dateStr = fmt(dateObj);
    // If the same date is clicked, we keep it but clear the time
    // Otherwise we update the date and clear the time
    onChange({ date: dateStr, time: '' });
  };

  const handleTimeClick = (timeStr) => {
    if (!value?.date) return;
    onChange({ date: value.date, time: timeStr });
  };

  // Build month calendar grid
  const daysInMonth = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    
    // 0 = Sunday, 1 = Monday. We want Monday to be 0
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6; 

    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push(new Date(y, m, d));
    }
    return cells;
  }, [currentMonth]);

  const todayStr = fmt(new Date());

  const isPast = (dateObj) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dateObj < today;
  };

  // The times for the selected date
  const availableTimes = useMemo(() => {
    if (!value?.date) return null;
    const booked = bookedSlotsMap[value.date] || [];
    return ALL_SLOTS.map(slot => ({
      time: slot,
      isBooked: booked.includes(slot)
    }));
  }, [value?.date, bookedSlotsMap]);

  if (!doctorId) {
    return (
      <div className={styles.container}>
        <div className={styles.calendarWrapper} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <CalendarIcon size={32} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <p>Te rugăm să selectezi un medic pentru a vizualiza orarul disponibil.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Calendar Card */}
      <div className={styles.calendarWrapper}>
        <div className={styles.header}>
          <button 
            type="button" 
            className={styles.navBtn} 
            onClick={handlePrevMonth}
            disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
          >
            <ChevronLeft size={20} />
          </button>
          <span className={styles.monthYear}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button type="button" className={styles.navBtn} onClick={handleNextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingWrapper}>
            <Loader2 size={20} className="animate-spin" />
            <span>Se încarcă disponibilitatea...</span>
          </div>
        ) : (
          <div className={styles.grid}>
            {dayLabels.map((lbl, i) => (
              <div key={i} className={styles.dayLabel}>{lbl}</div>
            ))}
            
            {daysInMonth.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className={styles.emptyCell} />;
              
              const dateStr = fmt(day);
              const isToday = dateStr === todayStr;
              const isSelected = value?.date === dateStr;
              const disabled = isPast(day);
              
              return (
                <div 
                  key={i} 
                  className={`
                    ${styles.dayCell} 
                    ${isToday ? styles.today : ''} 
                    ${isSelected ? styles.selected : ''} 
                    ${disabled ? styles.disabled : ''}
                  `}
                  onClick={() => handleDateClick(day)}
                >
                  {day.getDate()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Time Slots Card */}
      {value?.date && availableTimes && (
        <div className={styles.timeSection}>
          <div className={styles.timeHeader}>
            <Clock size={18} />
            <span>Ore disponibile pentru {value.date}</span>
          </div>
          
          <div className={styles.timeGrid}>
            {availableTimes.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={slot.isBooked}
                className={`
                  ${styles.timeSlot} 
                  ${slot.isBooked ? styles.booked : ''} 
                  ${value.time === slot.time ? styles.selected : ''}
                `}
                onClick={() => handleTimeClick(slot.time)}
              >
                {slot.time}
              </button>
            ))}
          </div>
          {availableTimes.every(s => s.isBooked) && (
            <div style={{ fontSize: '0.875rem', color: 'var(--danger-color)', textAlign: 'center', marginTop: '0.5rem' }}>
              Nu există locuri libere în această zi. Te rugăm să alegi o altă dată.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
