import { z } from "zod";
const officialLink = z
  .string()
  .trim()
  .max(500)
  .refine((v) => !v || /^https:\/\//i.test(v), "Use an HTTPS URL.");
export const facultySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .regex(/^[A-Za-z0-9_-]+$/)
      .transform((v) => v.toUpperCase()),
    name_ms: z.string().trim().min(3).max(250),
    name_en: z.string().trim().min(3).max(250),
    kind: z.enum(["faculty", "institute"]),
    website: officialLink,
    source_url: officialLink.optional(),
    notes: z.string().trim().max(2000).optional(),
    is_active: z.boolean(),
  })
  .strict();
export const facultyPatch = facultySchema
  .partial()
  .refine((v) => Object.keys(v).length > 0);
