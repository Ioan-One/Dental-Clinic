Dental Clinic


1. User Authentication and Role Management
  1.1. User Registration and Profiles
    1.1.1. Account Types: The system must support four distinct roles: Patient, Assistant, Doctor, and Admin.
    1.1.2. Email Validation: Registration requires a unique, RFC 5322 compliant email address.
    1.1.3. Password Security: Minimum 8 characters, including one uppercase, one lowercase, one number, and one special character. Passwords must be hashed using bcrypt before database storage.
    1.1.4. Validation: System must return specific error messages for missing fields, invalid email, weak password or email already in use.
    1.1.4. User Registration page should contain the following fields: First Name, Last Name, Email, Phone number, Password, Confirm Password.

  1.2. Access Control and Security
    1.2.1. Session Management: Implementation of secure JWT (JSON Web Tokens) with a 24-hour expiration.
    1.2.2. Account Protection: Temporary 15-minute lockout after 5 consecutive failed login attempts.
    1.2.3. Data Privacy (Soft Delete): Deleting a patient record or appointment must set an is_deleted = true flag to preserve medical history for legal compliance



2. Patient Management System
  2.1. Digital Patient Files
    2.1.1. Access Logic: * Patients: Can view only their own medical history and upcoming appointments.
      Owners/Admins: Full read/write access to all patient records in the database.
    2.1.2. File Encryption: All sensitive medical documents and personal data must be encrypted at rest using AES-256 to ensure HIPAA/GDPR compliance.
    2.1.3. Image Optimization: The system must automatically compress large X-ray files (DICOM/JPG) upon upload to a maximum of 5MB to optimize storage and loading speeds.



3. Appointment Life-Cycle
  3.1. Booking and Slot Management
    3.1.1. Slot Locking: When a user selects a time slot, the system must implement a "soft lock" for 10 minutes to prevent double-booking during the checkout/confirmation process.
    3.1.2. Validation: Appointments cannot be booked for past dates or outside of clinic operating hours.
    3.1.3. Pagination: The appointment list view for doctors must be fetched in chunks of 10 records per page using limit/offset queries.
  3.2. Automated Notifications
    3.2.1. SMS Trigger: The system shall automatically trigger an SMS notification via a third-party API (e.g., Twilio) 24 hours prior to a scheduled appointment.
    3.2.2. Status Updates: Patients receive instant notifications for booking confirmations, rescheduling, or cancellations.



4. Interactive Dental Mapping (Core Logic)
  4.1. Mandibular and Maxillary Model
    4.1.1. Interactive Interface: A 2D or 3D graphical representation of the human mandible and teeth where each tooth is a clickable entity.
    4.1.2. Tooth Metadata: Clicking a specific tooth (referenced by universal numbering, e.g., Tooth #8) triggers a detail pop-up.
  4.2. Diagnostic Overlay
    4.2.1. Detail Pop-up: The pop-up must display:
      History: Past procedures (fillings, crowns, root canals).
      Status: Current health status (Healthy, Decayed, Missing).
      Notes: Specific doctor observations in plain text (max 500 characters).
    4.2.2. Visual Coding: The system maps the tooth status to a visual output: Green (Healthy), Yellow (Requires Watch), and Red (Immediate Intervention Required).









5. Technical Infrastructure
5.1. File Constraints
5.1.1. Format Support: The system accepts .jpeg, .jpg, .png, and .webp for standard clinical photos, and .dcm for specialized X-rays.
5.1.2. Database Integrity: A patient file cannot be saved without a unique Patient ID and at least one contact method.

