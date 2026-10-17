import { z } from "zod";
export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(200),
  documentType: z.enum(["ic", "passport"]),
  documentNumber: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .transform((v) => v.toUpperCase().replace(/[\s-]/g, "")),
  email: z.string().email().max(200),
  phone: z.string().trim().min(3).max(40),
  address: z.string().trim().min(3).max(1000),
  category: z.enum(["local", "international"]),
  offeringId: z.string().min(1),
  agentName: z.string().trim().max(200).optional(),
  agentCode: z.string().trim().max(100).optional(),
  eventName: z.string().trim().max(200).optional(),
  eventDate: z.string().max(20).optional(),
  language: z.enum(["ms", "en"]).optional(),
  idempotencyKey: z.string().uuid(),
});
export const cataloguePatch = z.object({
  name: z.string().trim().min(2).max(250),
  total_fee: z.coerce.number().finite().min(0).max(99999999),
  duration: z.string().trim().min(1).max(100),
  is_active: z.boolean(),
  faculty: z.string().trim().min(2).max(50).optional(),
  structure: z.string().trim().min(2).max(100).optional(),
  attendance: z.string().trim().min(2).max(100).optional(),
  delivery: z.string().trim().min(2).max(100).optional(),
  review_confirmed: z.boolean().optional(),
});
