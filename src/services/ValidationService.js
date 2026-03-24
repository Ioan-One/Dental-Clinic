export const validateAppointment = (appointment) => {
  const errors = {};

  if (!appointment.patientName || appointment.patientName.trim() === '') {
    errors.patientName = 'Numele pacientului este obligatoriu.';
  }

  const cleanPhone = appointment.contact ? appointment.contact.replace(/[\s\-()+]/g, '') : '';
  const phoneCharRegex = /^\+?[\d\s\-()]+$/;
  if (!appointment.contact || !phoneCharRegex.test(appointment.contact) || cleanPhone.length < 7 || cleanPhone.length > 15) {
    errors.contact = 'Un număr de contact valid (7-15 cifre) este obligatoriu.';
  }

  if (!appointment.date) {
    errors.date = 'Data este obligatorie.';
  }

  if (!appointment.time) {
    errors.time = 'Ora este obligatorie.';
  }

  if (!appointment.type || appointment.type.trim() === '') {
    errors.type = 'Tipul programării este obligatoriu.';
  }

  if (!appointment.doctor || appointment.doctor.trim() === '') {
    errors.doctor = 'Numele medicului este obligatoriu.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
