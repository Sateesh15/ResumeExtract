import { z } from "zod";

// Education entry schema
export const educationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  graduationDate: z.string().optional(),
  field: z.string().optional(),
});

// Experience entry schema
export const experienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

// Certification schema
export const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
});

// Attachment schema
export const attachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  extractedText: z.string().optional(),
  processed: z.boolean().default(false),
});

// Confidence scores schema
export const confidenceScoresSchema = z.object({
  overall: z.number().min(0).max(1),
  name: z.number().min(0).max(1).optional(),
  emails: z.number().min(0).max(1).optional(),
  phones: z.number().min(0).max(1).optional(),
  education: z.number().min(0).max(1).optional(),
  experience: z.number().min(0).max(1).optional(),
  skills: z.number().min(0).max(1).optional(),
});

// Candidate schema (for MemStorage)
export const candidateSchema = z.object({
  id: z.string(),
  fullName: z.string().nullable(),
  emails: z.array(z.string()).default([]),
  phones: z.array(z.string()).default([]),
  summary: z.string().nullable(),
  education: z.array(educationSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  skills: z.array(z.string()).default([]),
  certifications: z.array(certificationSchema).default([]),
  attachments: z.array(attachmentSchema).default([]),
  sourceFile: z.string(),
  extractedAt: z.string(),
  confidence: confidenceScoresSchema.optional(),
  flagged: z.boolean().default(false),
  extractionMode: z.enum(["manual", "ai"]),
  rawText: z.string().optional(),
});

// Insert candidate schema (omits id and extractedAt)
export const insertCandidateSchema = candidateSchema.omit({
  id: true,
  extractedAt: true,
});

// Extraction job schema (for MemStorage)
export const extractionJobSchema = z.object({
  id: z.string(),
  status: z.enum(["queued", "processing", "completed", "failed"]).default("queued"),
  files: z.array(z.string()).default([]),
  mode: z.enum(["manual", "ai"]),
  totalFiles: z.number().default(0),
  processedFiles: z.number().default(0),
  candidateIds: z.array(z.string()).default([]),
  error: z.string().nullable(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
});

// Insert extraction job schema
export const insertExtractionJobSchema = extractionJobSchema.omit({
  id: true,
  startedAt: true,
});

// TypeScript types derived from Zod schemas
export type Education = z.infer<typeof educationSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type ConfidenceScores = z.infer<typeof confidenceScoresSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type ExtractionJob = z.infer<typeof extractionJobSchema>;
export type InsertExtractionJob = z.infer<typeof insertExtractionJobSchema>;
