import { z } from 'zod';

export const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(5, "Phone number is too short")
});

export const validatePatient = (req, res, next) => {
  const result = patientSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.issues });
  }
  req.body = result.data;
  next();
};
