import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, CalendarClock } from 'lucide-react';
import { useData } from '../store/DataStore';
import { validateAppointment } from '../services/ValidationService';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import styles from './MasterView.module.css';

export default function MasterView() {
  const { appointments, addAppointment, updateAppointment, deleteAppointment } = useData();
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApt, setEditingApt] = useState(null);
  const [formData, setFormData] = useState({
    patientName: '', contact: '', date: '', time: '', type: '', doctor: '', status: 'confirmed'
  });
  const [errors, setErrors] = useState({});

  const handleOpenModal = (apt = null) => {
    setErrors({});
    if (apt) {
      setEditingApt(apt);
      setFormData(apt);
    } else {
      setEditingApt(null);
      setFormData({ patientName: '', contact: '', date: '', time: '', type: '', doctor: '', status: 'confirmed' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateAppointment(formData);
    
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

  const columns = [
    { header: 'ID Programare', accessor: 'id', render: (row) => <span className={styles.idText}>{row.id}</span> },
    { header: 'Pacient', accessor: 'patientName' },
    { header: 'Contact', accessor: 'contact' },
    { header: 'Data & Ora', render: (row) => (
      <div className={styles.dateTime}>
        <span className={styles.date}><CalendarClock size={14}/> {row.date}</span>
        <span className={styles.time}>{row.time}</span>
      </div>
    )},
    { header: 'Tip', accessor: 'type' },
    { header: 'Medic', accessor: 'doctor' },
    { header: 'Stare', render: (row) => {
      const displayStatus = {
        'confirmed': 'Confirmat',
        'pending': 'În așteptare',
        'completed': 'Finalizat',
        'cancelled': 'Anulat'
      }[row.status] || row.status;
      return <Badge type={row.status}>{displayStatus}</Badge>;
    }}
  ];

  const renderActions = (row) => (
    <>
      <button className={styles.actionBtn} onClick={() => handleOpenModal(row)} title="Editează">
        <Edit2 size={16} />
      </button>
      <button className={styles.actionBtn} onClick={() => navigate(`/patient/${row.patientId}`)} title="Vezi Detalii">
        <Eye size={16} />
      </button>
      <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(row.id)} title="Șterge">
        <Trash2 size={16} />
      </button>
    </>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Managementul Programărilor</h1>
          <p className={styles.subtitle}>Programare inteligentă cu management Soft-Lock al intervalelor și notificări automate</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={20} /> Programare Nouă
        </button>
      </div>

      <Table 
        columns={columns} 
        data={appointments} 
        itemsPerPage={5} 
        renderRowActions={renderActions} 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingApt ? "Editează Programarea" : "Programare Nouă"}
      >
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Nume Pacient</label>
            <input 
              type="text" 
              value={formData.patientName} 
              onChange={(e) => setFormData({...formData, patientName: e.target.value})} 
            />
            {errors.patientName && <span className={styles.error}>{errors.patientName}</span>}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Număr de Contact</label>
              <input 
                type="text" 
                value={formData.contact} 
                onChange={(e) => setFormData({...formData, contact: e.target.value})} 
              />
              {errors.contact && <span className={styles.error}>{errors.contact}</span>}
            </div>
            
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
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Dată</label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={(e) => setFormData({...formData, date: e.target.value})} 
              />
              {errors.date && <span className={styles.error}>{errors.date}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>Oră</label>
              <input 
                type="time" 
                value={formData.time} 
                onChange={(e) => setFormData({...formData, time: e.target.value})} 
              />
              {errors.time && <span className={styles.error}>{errors.time}</span>}
            </div>
          </div>

          <div className={styles.formRow}>
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
            <div className={styles.formGroup}>
              <label>Medic</label>
              <input 
                type="text" 
                value={formData.doctor} 
                onChange={(e) => setFormData({...formData, doctor: e.target.value})} 
              />
              {errors.doctor && <span className={styles.error}>{errors.doctor}</span>}
            </div>
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
