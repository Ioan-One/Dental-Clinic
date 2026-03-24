export const initialPatients = [
  {
    id: "PT-001",
    name: "John Doe",
    lastVisit: "12/10/2025",
    teeth: {
      // 1 to 32 mapping statuses: "healthy", "watch", "critical"
      1: "healthy", 2: "healthy", 3: "watch", 4: "healthy", 5: "healthy",
      6: "healthy", 7: "healthy", 8: "healthy", 9: "healthy", 10: "healthy",
      11: "healthy", 12: "healthy", 13: "critical", 14: "watch", 15: "healthy",
      16: "healthy", 17: "healthy", 18: "healthy", 19: "healthy", 20: "healthy",
      21: "watch", 22: "healthy", 23: "healthy", 24: "healthy", 25: "healthy",
      26: "healthy", 27: "healthy", 28: "healthy", 29: "healthy", 30: "critical",
      31: "healthy", 32: "healthy"
    }
  },
  {
    id: "PT-002",
    name: "Sarah Johnson",
    lastVisit: "01/15/2026",
    teeth: { 1: "healthy", 2: "critical", 3: "healthy", /* defaults for others */ }
  }
];

export const initialAppointments = [
  {
    id: "APT-001",
    patientName: "Sarah Johnson",
    patientId: "PT-002",
    contact: "+1 555-0101",
    date: "2026-03-11",
    time: "09:00",
    type: "Control de Rutină",
    doctor: "Dr. Smith",
    status: "confirmed"
  },
  {
    id: "APT-002",
    patientName: "Michael Chen",
    patientId: "PT-003",
    contact: "+1 555-0102",
    date: "2026-03-11",
    time: "10:30",
    type: "Tratament de Canal",
    doctor: "Dr. Johnson",
    status: "confirmed"
  },
  {
    id: "APT-003",
    patientName: "Emily Davis",
    patientId: "PT-004",
    contact: "+1 555-0103",
    date: "2026-03-11",
    time: "11:00",
    type: "Igienizare Dentară",
    doctor: "Dr. Smith",
    status: "pending"
  },
  {
    id: "APT-004",
    patientName: "John Doe",
    patientId: "PT-001",
    contact: "+1 555-0104",
    date: "2026-03-11",
    time: "14:00",
    type: "Consultație",
    doctor: "Dr. Brown",
    status: "confirmed"
  },
  {
    id: "APT-005",
    patientName: "Alice Smith",
    patientId: "PT-001",
    contact: "+1 555-0105",
    date: "2026-03-12",
    time: "10:00",
    type: "Control de Rutină",
    doctor: "Dr. Smith",
    status: "pending"
  },
  {
    id: "APT-006",
    patientName: "Bob Jones",
    patientId: "PT-002",
    contact: "+1 555-0106",
    date: "2026-03-12",
    time: "11:30",
    type: "Igienizare Dentară",
    doctor: "Dr. Johnson",
    status: "completed"
  },
  {
    id: "APT-007",
    patientName: "Charlie Brown",
    patientId: "PT-003",
    contact: "+1 555-0107",
    date: "2026-03-13",
    time: "15:00",
    type: "Tratament de Canal",
    doctor: "Dr. Smith",
    status: "confirmed"
  }
];
