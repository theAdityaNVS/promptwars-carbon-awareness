import { z } from 'zod'

export const userBaselineSchema = z.object({
  commuteMode: z.enum(['car_solo', 'car_shared', 'bus', 'train', 'bike', 'walk', 'ev']),
  commuteKmPerWeek: z.number().nonnegative('Distance must be 0 or more').max(5000, 'Distance is too large'),
  dietPattern: z.string().min(1).max(30, 'Diet pattern is too long'),
  kwhPerWeek: z.number().nonnegative('Energy must be 0 or more').max(5000, 'Energy is too large'),
})

export const logEntrySchema = z.object({
  id: z.string().min(1),
  category: z.enum(['transport', 'diet', 'energy']),
  subtype: z.string().min(1, 'Action subtype required').max(50, 'Action subtype is too long'),
  quantity: z.number().positive('Quantity must be greater than zero').max(5000, 'Quantity is too large'),
  unit: z.string().min(1).max(20, 'Unit is too long'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  description: z.string().max(200, 'Description must be under 200 characters').optional(),
})

export const assistantRequestSchema = z.object({
  entries: z.array(logEntrySchema).max(150, 'Too many entries logged'), // Guard rail against memory/timeout abuse
  baseline: userBaselineSchema.nullable(),
})
