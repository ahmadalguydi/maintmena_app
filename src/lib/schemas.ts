import { z } from 'zod';
import { JOB_STATUS, QUOTE_STATUS, URGENCY_LEVELS } from './constants';

// Basic Types
export const UuidSchema = z.string().uuid();
export const PostJobSchema = z.object({
    title: z.string().min(10, "Title must be at least 10 characters").max(80, "Title must be less than 80 characters"),
    description: z.string().min(50, "Description must be at least 50 characters").max(1000, "Description must be less than 1000 characters"),
    serviceCategory: z.string().min(1, "Category is required"),
    location: z.string().optional(),
    city: z.string().min(1, "City is required"),
    country: z.string().default('Saudi Arabia'),
    urgency: z.enum([URGENCY_LEVELS.LOW, URGENCY_LEVELS.MEDIUM, URGENCY_LEVELS.HIGH, URGENCY_LEVELS.CRITICAL]),
    budget: z.string().optional().refine((val) => !val || !isNaN(parseFloat(val)), "Budget must be a valid number"),
    deadline: z.date().optional(),
    preferredStartDate: z.date().optional(),
    paymentMethod: z.enum(['cash', 'online_maintmena']).default('cash'),
    // Dynamic fields (treated loosely for now as they vary by category)
    timeline: z.string().optional(),
    jobSize: z.string().optional(),
    siteStatus: z.string().optional(),
    facilityType: z.string().optional(),
    scopeOfWork: z.string().optional()
});

export const QuoteSchema = z.object({
    price: z.number().min(1, "Price must be greater than 0"),
    estimated_duration: z.string().min(1, "Duration is required"),
    proposal: z.string().min(20, "Proposal must be at least 20 characters").max(2000),
    cover_letter: z.string().optional(),
    valid_until: z.date().optional()
});

export type PostJobFormValues = z.infer<typeof PostJobSchema>;
export type QuoteFormValues = z.infer<typeof QuoteSchema>;
