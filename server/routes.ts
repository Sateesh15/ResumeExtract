import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import ExcelJS from "exceljs";
import { storage } from "./storage";
import { processFile } from "./lib/fileProcessing";
import { extractResumeData } from "./lib/openai";
import { insertCandidateSchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // POST /api/upload - Upload and process files
  app.post("/api/upload", upload.any(), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const mode = req.body.mode || "manual";
      const autoExtract = req.body.autoExtract === "true";

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      // Validate file types
      const allowedTypes = [
        "application/pdf",
        "message/rfc822",
        "application/octet-stream", // EML files sometimes have this type
      ];
      const invalidFiles = files.filter(
        (f) =>
          !allowedTypes.includes(f.mimetype) &&
          !f.originalname.toLowerCase().endsWith(".eml") &&
          !f.originalname.toLowerCase().endsWith(".pdf")
      );
      
      if (invalidFiles.length > 0) {
        return res.status(400).json({
          error: "Invalid file type. Only PDF and EML files are supported.",
        });
      }

      // Limit file size to 10MB
      const maxSize = 10 * 1024 * 1024;
      const oversizedFiles = files.filter((f) => f.size > maxSize);
      if (oversizedFiles.length > 0) {
        return res.status(400).json({
          error: "File size exceeds 10MB limit.",
        });
      }

      const file = files[0]; // For MVP, process first file only
      
      // Process the file to extract text
      const processed = await processFile(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      if (mode === "manual") {
        // Return raw text for manual extraction
        return res.json({
          success: true,
          rawText: processed.text,
          attachments: processed.attachments,
          filename: file.originalname,
        });
      } else if (mode === "ai" && autoExtract) {
        // Run AI extraction immediately
        const extracted = await extractResumeData(processed.text, file.originalname);
        
        const candidate = await storage.createCandidate({
          fullName: extracted.fullName,
          emails: extracted.emails,
          phones: extracted.phones,
          summary: extracted.summary,
          education: extracted.education,
          experience: extracted.experience,
          skills: extracted.skills,
          certifications: extracted.certifications,
          attachments: processed.attachments,
          sourceFile: file.originalname,
          extractionMode: "ai",
          flagged: false,
          rawText: processed.text,
          confidence: extracted.confidence,
        });

        return res.json({
          success: true,
          totalFiles: files.length,
          filesProcessed: 1,
          candidate,
        });
      } else {
        // Queue for later processing
        const job = await storage.createJob({
          status: "queued",
          files: [file.originalname],
          mode: "ai",
          totalFiles: files.length,
          processedFiles: 0,
          candidateIds: [],
          error: null,
          finishedAt: null,
        });

        return res.json({
          success: true,
          jobId: job.id,
          totalFiles: files.length,
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to process upload" });
    }
  });

  // GET /api/candidates - List all candidates
  app.get("/api/candidates", async (req, res) => {
    try {
      const candidates = await storage.getCandidates();
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  });

  // GET /api/candidates/:id - Get single candidate
  app.get("/api/candidates/:id", async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error) {
      console.error("Error fetching candidate:", error);
      res.status(500).json({ error: "Failed to fetch candidate" });
    }
  });

  // POST /api/candidates/:id - Update candidate
  app.post("/api/candidates/:id", async (req, res) => {
    try {
      const updated = await storage.updateCandidate(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating candidate:", error);
      res.status(500).json({ error: "Failed to update candidate" });
    }
  });

  // POST /api/candidates/:id/flag - Flag candidate for re-extraction
  app.post("/api/candidates/:id/flag", async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // Re-run AI extraction with deeper analysis
      if (candidate.rawText) {
        const extracted = await extractResumeData(
          candidate.rawText,
          candidate.sourceFile
        );
        
        const updated = await storage.updateCandidate(req.params.id, {
          ...extracted,
          flagged: true,
          attachments: candidate.attachments,
          sourceFile: candidate.sourceFile,
          extractionMode: candidate.extractionMode,
          rawText: candidate.rawText,
        });

        res.json(updated);
      } else {
        // Just flag it if no raw text available
        const flagged = await storage.flagCandidate(req.params.id);
        res.json(flagged);
      }
    } catch (error) {
      console.error("Error flagging candidate:", error);
      res.status(500).json({ error: "Failed to flag candidate" });
    }
  });

  app.post("/api/extract", async (req: Request, res: Response) => {
  console.log("🚀 START /api/extract");
  
  try {
    const { rawText, filename } = req.body;
    console.log("✅ Received:", { filename, textLength: rawText?.length });

    if (!rawText) {
      return res.status(400).json({ error: "rawText is required" });
    }

    console.log("⏳ Calling extractResumeData...");
    const start = Date.now();
    
    const extractedData = await extractResumeData(rawText, filename || "unknown");
    
    const duration = Date.now() - start;
    console.log(`✅ extractResumeData took ${duration}ms`);
    console.log("📦 Response data:", {
      fullName: extractedData?.fullName,
      hasEmails: !!extractedData?.emails,
      emailCount: extractedData?.emails?.length,
      hasSkills: !!extractedData?.skills,
      skillCount: extractedData?.skills?.length,
    });

    if (!extractedData) {
      console.error("❌ extractResumeData returned nothing!");
      return res.status(500).json({ error: "No data returned from extraction" });
    }

    console.log("📤 Sending JSON response");
    res.json(extractedData);
    console.log("🏁 END /api/extract - SUCCESS");
  } catch (error) {
    console.error("💥 CAUGHT ERROR:", error);
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    
    res.status(500).json({
      error: error instanceof Error ? error.message : "Extraction failed",
    });
    console.log("🏁 END /api/extract - ERROR");
  }
});

  // POST /api/extract/manual - Save manually extracted data
  app.post("/api/extract/manual", async (req, res) => {
    try {
      // Clean and prepare data from form
      const data = {
        fullName: req.body.fullName || null,
        emails: Array.isArray(req.body.emails)
          ? req.body.emails.filter((e: string) => e && e.trim())
          : [],
        phones: Array.isArray(req.body.phones)
          ? req.body.phones.filter((p: string) => p && p.trim())
          : [],
        summary: req.body.summary || null,
        education: req.body.education || [],
        experience: req.body.experience || [],
        skills: Array.isArray(req.body.skills)
          ? req.body.skills.filter((s: string) => s && s.trim())
          : [],
        certifications: req.body.certifications || [],
        attachments: req.body.attachments || [],
        sourceFile: req.body.sourceFile || "manual-entry",
        extractionMode: "manual" as const,
        flagged: false,
        rawText: req.body.rawText || "",
      };

      const candidate = await storage.createCandidate(data);
      res.json(candidate);
    } catch (error) {
      console.error("Error saving manual extraction:", error);
      res.status(400).json({ error: "Invalid candidate data", details: (error as Error).message });
    }
  });

  // POST /api/extract/ai - Run AI extraction on text
  app.post("/api/extract/ai", async (req, res) => {
    try {
      const { text, filename } = req.body;
      if (!text) {
        return res.status(400).json({ error: "No text provided" });
      }

      const extracted = await extractResumeData(text, filename || "unknown");
      res.json(extracted);
    } catch (error) {
      console.error("Error in AI extraction:", error);
      res.status(500).json({ error: "AI extraction failed" });
    }
  });

  // GET /api/jobs - List all jobs
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // GET /api/jobs/:id - Get job status
  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  // GET /api/export - Export candidates to Excel
  app.get("/api/export", async (req, res) => {
    try {
      const format = req.query.format || "xlsx";
      const candidates = await storage.getCandidates();

      if (format === "xlsx") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Candidates");

        // Define columns
        worksheet.columns = [
          { header: "ID", key: "id", width: 36 },
          { header: "Full Name", key: "fullName", width: 25 },
          { header: "Emails", key: "emails", width: 35 },
          { header: "Phones", key: "phones", width: 20 },
          { header: "Summary", key: "summary", width: 50 },
          { header: "Skills", key: "skills", width: 40 },
          { header: "Education Count", key: "educationCount", width: 15 },
          { header: "Experience Count", key: "experienceCount", width: 15 },
          { header: "Source File", key: "sourceFile", width: 30 },
          { header: "Extraction Mode", key: "extractionMode", width: 15 },
          { header: "Confidence", key: "confidence", width: 12 },
          { header: "Flagged", key: "flagged", width: 10 },
          { header: "Extracted At", key: "extractedAt", width: 20 },
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        // Add data rows
        if (candidates && candidates.length > 0) {
          candidates.forEach((candidate) => {
            worksheet.addRow({
              id: candidate.id,
              fullName: candidate.fullName || "",
              emails: candidate.emails?.join(", ") || "",
              phones: candidate.phones?.join(", ") || "",
              summary: candidate.summary || "",
              skills: candidate.skills?.join(", ") || "",
              educationCount: candidate.education?.length || 0,
              experienceCount: candidate.experience?.length || 0,
              sourceFile: candidate.sourceFile,
              extractionMode: candidate.extractionMode,
              confidence: candidate.confidence?.overall
                ? (candidate.confidence.overall * 100).toFixed(0) + "%"
                : "",
              flagged: candidate.flagged ? "Yes" : "No",
              extractedAt: new Date(candidate.extractedAt).toLocaleString(),
            });
          });
        }

        // Set response headers for file download
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=candidates-${new Date().toISOString().split("T")[0]}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
      } else {
        res.status(400).json({ error: "Unsupported export format" });
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
