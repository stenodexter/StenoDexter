import z from "zod";

export const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  department: z.string().min(1, "Department is required"),
  photoKey: z.string().optional(),
  batch: z.string().optional(),
  note: z.string().max(200, "Note must be at most 200 characters").optional(),
});

export const updateSchema = z.object({
  id: z.string().min(1, "Entry ID is required"),
  name: z.string().min(1, "Name is required").optional(),
  department: z.string().min(1, "Department is required").optional(),
  photoKey: z.string().nullable().optional(),
  batch: z.string().nullable().optional(),
  note: z.string().max(200, "Note must be at most 200 characters").nullable().optional(),
});