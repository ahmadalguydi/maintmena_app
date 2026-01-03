import { z } from 'zod';

// Bilingual error messages
const errors = {
  name: {
    min: 'الاسم قصير جداً / Name must be at least 2 characters',
    max: 'الاسم طويل جداً / Name too long',
    invalid: 'اسم غير صالح / Invalid name'
  },
  email: {
    invalid: 'بريد إلكتروني غير صالح / Invalid email address',
    max: 'البريد الإلكتروني طويل جداً / Email too long'
  },
  password: {
    min: 'كلمة المرور قصيرة جداً / Password must be at least 8 characters',
    max: 'كلمة المرور طويلة جداً / Password too long',
    uppercase: 'يجب أن تحتوي على حرف كبير / Must contain uppercase letter',
    lowercase: 'يجب أن تحتوي على حرف صغير / Must contain lowercase letter',
    number: 'يجب أن تحتوي على رقم / Must contain a number',
    mismatch: 'كلمات المرور غير متطابقة / Passwords do not match'
  },
  phone: {
    invalid: 'رقم هاتف غير صالح / Invalid phone number format'
  }
};

// Password validation schema
const passwordSchema = z.string()
  .min(8, errors.password.min)
  .max(128, errors.password.max)
  .regex(/[A-Z]/, errors.password.uppercase)
  .regex(/[a-z]/, errors.password.lowercase)
  .regex(/[0-9]/, errors.password.number);

// Signup validation schema
export const signupSchema = z.object({
  name: z.string()
    .min(2, errors.name.min)
    .max(100, errors.name.max)
    .trim()
    // Allow letters (Latin + Arabic), spaces, hyphens, apostrophes, periods
    .regex(/^[a-zA-Z\u0600-\u06FF\s\-'.]+$/, errors.name.invalid),
  email: z.string()
    .email(errors.email.invalid)
    .max(255, errors.email.max)
    .toLowerCase()
    .trim(),
  password: passwordSchema,
  confirmPassword: z.string(),
  phone: z.string()
    .regex(/^\+?[0-9]{10,15}$/, errors.phone.invalid)
    .optional()
    .or(z.literal('')),
  companyName: z.string()
    .max(200, 'Company name too long')
    .trim()
    .optional()
    .or(z.literal('')),
  accountType: z.enum(['individual', 'company']),
}).refine(data => data.password === data.confirmPassword, {
  message: errors.password.mismatch,
  path: ['confirmPassword'],
});

// Post request validation schema
export const postRequestSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title too long')
    .trim(),
  category: z.string()
    .min(1, 'Category is required'),
  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description too long')
    .trim(),
  city: z.string()
    .min(2, 'City is required')
    .max(100, 'City name too long')
    .trim(),
  neighborhood: z.string()
    .max(100, 'Neighborhood name too long')
    .trim()
    .optional()
    .or(z.literal('')),
  urgency: z.enum(['low', 'medium', 'high']),
  budgetMin: z.string()
    .refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
      message: 'Invalid minimum budget'
    })
    .optional()
    .or(z.literal('')),
  budgetMax: z.string()
    .refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
      message: 'Invalid maximum budget'
    })
    .optional()
    .or(z.literal('')),
});

// Quote submission validation schema
export const quoteSchema = z.object({
  price: z.string()
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Price must be a positive number'
    })
    .refine(val => parseFloat(val) <= 10000000, {
      message: 'Price exceeds maximum allowed'
    }),
  duration: z.string()
    .min(1, 'Duration is required')
    .max(100, 'Duration description too long')
    .trim(),
  proposal: z.string()
    .min(20, 'Proposal must be at least 20 characters')
    .max(10000, 'Proposal too long')
    .trim(),
  laborCost: z.string()
    .refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
      message: 'Invalid labor cost'
    })
    .optional()
    .or(z.literal('')),
  materialCost: z.string()
    .refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
      message: 'Invalid material cost'
    })
    .optional()
    .or(z.literal('')),
});

// Message validation schema
export const messageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long')
    .trim(),
});

// Contact form validation schema
export const contactFormSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  company: z.string()
    .trim()
    .max(200, 'Company name must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  subject: z.string()
    .trim()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be less than 200 characters'),
  message: z.string()
    .trim()
    .min(1, 'Message is required')
    .max(2000, 'Message must be less than 2000 characters'),
});