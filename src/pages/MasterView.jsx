import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, CalendarClock, WifiOff, Play, Square, Search, Filter, Smile } from 'lucide-react';
import { useData } from '../store/DataStore';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { validateAppointment } from '../services/ValidationService';
import { useAuth } from '../store/AuthContext';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import DateTimePicker from '../components/DateTimePicker';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './MasterView.module.css';

export default function MasterView() {
  const { appointments, addAppointment, updateAppointment, deleteAppointment, isOffline, patients, doctors } = useData();
  const { user, hasPermission, isAdmin } = useAuth();
  const canWrite = hasPermission('appointments:write');
  const canWriteOwn = hasPermission('appointments:write:own');
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApt, setEditingApt] = useState(null);
  const [formData, setFormData] = useState({
    patientId: '', doctorId: '', date: '', time: '', type: '', status: 'confirmed'
  });
  const [errors, setErrors] = useState({});

  // Filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenModal = (apt = null) => {
    setErrors({});
    if (apt) {
      setEditingApt(apt);
      setFormData({
        patientId: apt.patientId || '',
        doctorId: apt.doctorId || '',
        date: apt.date || '',
        time: apt.time || '',
        type: apt.type || '',
        status: apt.status || 'confirmed',
      });
    } else {
      setEditingApt(null);
      // Pre-fill locked fields based on role
      const defaultPatientId = canWriteOwn && !canWrite && user?.patientId ? user.patientId : '';
      const defaultDoctorId  = user?.role === 'doctor' && user?.doctorId ? user.doctorId : '';
      const defaultStatus    = user?.role === 'patient' ? 'pending' : 'confirmed';
      setFormData({ patientId: defaultPatientId, doctorId: defaultDoctorId, date: '', time: '', type: '', status: defaultStatus });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Build validation-compatible object
    const aptData = {
      ...formData,
      patientName: formData.patientId ? 'set' : '',
      doctor: formData.doctorId ? 'set' : '',
      contact: '0000000000', // Will be resolved server-side
    };

    const validation = validateAppointment(aptData);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    if (editingApt) {
      updateAppointment(editingApt.id, formData);
    } else {
      addAppointment(formData);
    }
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm("Sunteți sigur că doriți să ștergeți această programare?")) {
      deleteAppointment(id);
    }
  };

  const handleStartFaker = async () => {
    await fetchWithAuth('/api/generate/start', { method: 'POST' }).catch(() => {});
  };

  const handleStopFaker = async () => {
    await fetchWithAuth('/api/generate/stop', { method: 'POST' }).catch(() => {});
  };

  // Apply local filters — patients/doctors see only their own appointments
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    if (user?.role === 'patient' && user?.patientId) {
      filtered = filtered.filter(apt => apt.patientId === user.patientId);
    }
    if (user?.role === 'doctor' && user?.doctorId) {
      filtered = filtered.filter(apt => apt.doctorId === user.doctorId);
    }
    if (statusFilter) {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(apt =>
        (apt.patientName || '').toLowerCase().includes(q) ||
        (apt.doctor || '').toLowerCase().includes(q) ||
        (apt.type || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [appointments, statusFilter, searchQuery, user]);

  const isPatient = user?.role === 'patient';
  const isDoctor  = user?.role === 'doctor';

  const columns = [
    !isPatient && { header: 'ID', accessor: 'id', render: (row) => <span className={styles.idText}>{row.id}</span> },
    !isPatient && { header: 'Pacient', accessor: 'patientName' },
    !isPatient && { header: 'Contact', accessor: 'contact' },
    { header: 'Data & Ora', render: (row) => (
      <div className={styles.dateTime}>
        <span className={styles.date}><CalendarClock size={14}/> {row.date}</span>
        <span className={styles.time}>{row.time}</span>
      </div>
    )},
    { header: 'Tip', accessor: 'type' },
    !isDoctor && { header: 'Medic', accessor: 'doctor' },
    { header: 'Stare', render: (row) => {
      const displayStatus = {
        'confirmed': 'Confirmat',
        'pending': 'În așteptare',
        'completed': 'Finalizat',
        'cancelled': 'Anulat'
      }[row.status] || row.status;
      return <Badge type={row.status}>{displayStatus}</Badge>;
    }}
  ].filter(Boolean);

  const renderActions = (row) => (
    <>
      {canWrite && (
        <button className={styles.actionBtn} onClick={() => handleOpenModal(row)} title="Editează">
          <Edit2 size={16} />
        </button>
      )}
      {!isPatient && (
        <button className={styles.actionBtn} onClick={() => navigate(`/patient/${row.patientId || row.id}`)} title="Vezi Detalii">
          <Eye size={16} />
        </button>
      )}
      {canWrite && (
        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(row.id)} title="Șterge">
          <Trash2 size={16} />
        </button>
      )}
    </>
  );

  // Chart Logic — scoped to whatever the current user can see
  const chartData = useMemo(() => {
    const counts = { confirmed: 0, pending: 0, completed: 0, cancelled: 0 };
    filteredAppointments.forEach(apt => {
        if(counts[apt.status] !== undefined) counts[apt.status]++;
    });
    return Object.entries(counts).map(([status, count]) => ({
        name: status,
        value: count
    })).filter(item => item.value > 0);
  }, [filteredAppointments]);

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

  return (
    <div className={styles.container}>
      {isOffline && (
        <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: '500' }}>
            <WifiOff size={18} /> Rețea Deconectată. Setările vor fi sincronizate ulterior cu serverul.
        </div>
      )}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {isPatient ? 'Istoricul Programărilor' : isDoctor ? 'Agenda Mea' : 'Managementul Programărilor'}
          </h1>
          <p className={styles.subtitle}>
            {isPatient
              ? 'Programările și istoricul tău medical'
              : isDoctor
              ? 'Consultațiile și procedurile tale programate'
              : 'Gestionează toate programările clinicii'}
          </p>
        </div>
        
        <div className={styles.headerActions}>
            {isAdmin && (
              <>
                <button className="btn btn-outline" onClick={handleStartFaker} title="Start Faker WebSocket">
                    <Play size={16} /> Pornire Generare Date (Faker)
                </button>
                <button className="btn btn-outline" onClick={handleStopFaker} title="Stop Faker">
                    <Square size={16} /> Oprire
                </button>
              </>
            )}
            {isPatient && user?.patientId && (
              <button className="btn btn-outline" onClick={() => navigate(`/patient/${user.patientId}`)}>
                <Smile size={18} /> Mapa Dinților Mei
              </button>
            )}
            {(canWrite || canWriteOwn) && (
              <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                  <Plus size={20} /> Programare Nouă
              </button>
            )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Caută pacient, medic, tip..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <Filter size={16} />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Toate Stările</option>
            <option value="confirmed">Confirmat</option>
            <option value="pending">În așteptare</option>
            <option value="completed">Finalizat</option>
            <option value="cancelled">Anulat</option>
          </select>
        </div>
      </div>

      <div className={styles.mainContent}>
          <div className={styles.chartContainer}>
              <h3 className={styles.chartTitle}>
                {isPatient || isDoctor ? 'Statusul Programărilor Tale' : 'Status Programări'}
              </h3>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
          </div>

          <div className={styles.tableContainer}>
              <Table
                columns={columns}
                data={filteredAppointments}
                itemsPerPage={5}
                renderRowActions={isPatient ? undefined : renderActions}
              />
          </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingApt ? "Editează Programarea" : "Programare Nouă"}
      >
        <form onSubmit={handleSubmit} className={styles.form}>
          {!isPatient && (
            <div className={styles.formGroup}>
              <label>Pacient</label>
              <select
                value={formData.patientId}
                onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                disabled={canWriteOwn && !canWrite}
              >
                <option value="">Selectează Pacient...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
              {errors.patientName && <span className={styles.error}>{errors.patientName}</span>}
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Medic</label>
              <select
                value={formData.doctorId}
                onChange={(e) => setFormData({...formData, doctorId: e.target.value})}
                disabled={isDoctor}
              >
                <option value="">Selectează Medic...</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>Dr. {d.lastName} - {d.specialization}</option>
                ))}
              </select>
              {errors.doctor && <span className={styles.error}>{errors.doctor}</span>}
            </div>
            
            {!isPatient && (
              <div className={styles.formGroup}>
                <label>Stare</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="confirmed">Confirmat</option>
                  <option value="pending">În așteptare</option>
                  <option value="completed">Finalizat</option>
                  <option value="cancelled">Anulat</option>
                </select>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Dată și Oră</label>
            <DateTimePicker 
              doctorId={formData.doctorId} 
              value={{ date: formData.date, time: formData.time }} 
              onChange={({ date, time }) => setFormData({ ...formData, date, time })} 
            />
            {errors.date && <span className={styles.error}>{errors.date}</span>}
            {!errors.date && errors.time && <span className={styles.error}>{errors.time}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>Tip</label>
            <select 
              value={formData.type} 
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="">Selectează Tipul...</option>
              <option value="Control de Rutină">Control de Rutină</option>
              <option value="Tratament de Canal">Tratament de Canal</option>
              <option value="Igienizare Dentară">Igienizare Dentară</option>
              <option value="Consultație">Consultație</option>
            </select>
            {errors.type && <span className={styles.error}>{errors.type}</span>}
          </div>

          <div className={styles.formActions}>
            <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Anulează</button>
            <button type="submit" className="btn btn-primary">Salvează Programarea</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
