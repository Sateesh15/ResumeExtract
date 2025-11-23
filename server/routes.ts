import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import ExcelJS from "exceljs";
import { storage } from "./storage";
import { processFile } from "./lib/fileProcessing";
import { extractResumeData } from "./lib/openai";
import { insertCandidateSchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

// ✅ HELPER FUNCTION 1: Extract URLs from raw text
// function extractUrls(rawText: string | null): {
//   linkedin: string | null;
//   github: string | null;
//   portfolio: string | null;
// } {
//   if (!rawText) return { linkedin: null, github: null, portfolio: null };

//   const linkedinMatch = rawText.match(/linkedin\.com\/in\/[\w-]+/i);
//   const githubMatch = rawText.match(/github\.com\/[\w-]+/i);
//   const portfolioMatch = rawText.match(/https?:\/\/(?!linkedin|github)[\w.-]+\.[a-z]{2,}(?:\/[\w.-]*)?/i);

//   return {
//     linkedin: linkedinMatch ? `https://${linkedinMatch[0]}` : null,
//     github: githubMatch ? `https://${githubMatch[0]}` : null,
//     portfolio: portfolioMatch ? portfolioMatch[0] : null,
//   };
// }

function extractUrls(rawText: string | null): {
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
} {
  if (!rawText) return { linkedin: null, github: null, portfolio: null };

  let linkedin: string | null = null;
  let github: string | null = null;
  let portfolio: string | null = null;

  // Extract LinkedIn - multiple patterns
  const linkedinPatterns = [
    /linkedin\.com\/in\/([\w-]+)/i,
    /linkedin\.com\/([\w-]+)/i,
  ];
  for (const pattern of linkedinPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      linkedin = `https://linkedin.com/in/${match[1]}`;
      break;
    }
  }

  // Extract GitHub - multiple patterns
  const githubPatterns = [
    /github\.com\/([\w-]+)(?:\/)?(?:\s|$)/i,
    /https?:\/\/github\.com\/([\w-]+)/i,
  ];
  for (const pattern of githubPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      github = `https://github.com/${match[1]}`;
      break;
    }
  }

  // Extract Portfolio - look for URLs that are NOT LinkedIn or GitHub
  const urlPattern = /https?:\/\/([\w.-]+\.[a-z]{2,}(?:\/[\w.-]*)?)/gi;
  const urls = rawText.match(urlPattern) || [];
  for (const url of urls) {
    if (!url.includes("linkedin") && !url.includes("github")) {
      portfolio = url;
      break;
    }
  }

  return { linkedin, github, portfolio };
}

// ✅ HELPER FUNCTION 2: Calculate total experience
// function calculateTotalExperience(experience: any[]): string {
//   if (!experience || experience.length === 0) return "0";

//   let totalMonths = 0;

//   experience.forEach((exp) => {
//     const startDate = parseDate(exp.startDate);
//     const endDate = exp.endDate?.toLowerCase().includes("present")
//       ? new Date()
//       : parseDate(exp.endDate);

//     if (startDate && endDate) {
//       const months =
//         (endDate.getFullYear() - startDate.getFullYear()) * 12 +
//         (endDate.getMonth() - startDate.getMonth());
//       totalMonths += months;
//     }
//   });

//   const years = Math.floor(totalMonths / 12);
//   const months = totalMonths % 12;

//   if (years === 0) return `${months} months`;
//   if (months === 0) return `${years} years`;
//   return `${years} years ${months} months`;
// }

// function calculateTotalExperience(experience: any[]): string {
//   if (!experience || experience.length === 0) return "Fresher"; // Changed from "0"

//   let totalMonths = 0;
//   let validJobs = 0;

//   experience.forEach((exp) => {
//     const startDate = parseDate(exp.startDate);
//     const endDate = exp.endDate?.toLowerCase().includes("present")
//       ? new Date()
//       : parseDate(exp.endDate);

//     if (startDate && endDate) {
//       const months =
//         (endDate.getFullYear() - startDate.getFullYear()) * 12 +
//         (endDate.getMonth() - startDate.getMonth());
//       if (months >= 0) {
//         totalMonths += months;
//         validJobs++;
//       }
//     }
//   });

//   // If no valid dates found, return N/A
//   if (validJobs === 0 || totalMonths < 0) return "N/A";

//   const years = Math.floor(totalMonths / 12);
//   const months = totalMonths % 12;

//   // Grammar: "1 year" not "1 years", "0 months" not shown
//   if (years === 0) {
//     if (months === 0) return "< 1 month";
//     return months === 1 ? `${months} month` : `${months} months`;
//   }

//   if (months === 0) {
//     return years === 1 ? `${years} year` : `${years} years`;
//   }

//   // Both years and months
//   const yearText = years === 1 ? "year" : "years";
//   const monthText = months === 1 ? "month" : "months";
//   return `${years} ${yearText} ${months} ${monthText}`;
// }

function calculateTotalExperience(candidate: any): string {
  // ✅ PRIORITY 1: Check summary for stated experience
  const experience = candidate.experience;
  const summary = candidate.summary || "";
  const rawText = candidate.rawText || "";
  const fullText = (summary + " " + rawText).toLowerCase();

  // Look for patterns like "3.9 years", "4.3 years of experience", "2 years", etc.
  const summaryExperiencePatterns = [
    /(\d+(?:\.\d+)?)\s*years?\s+of\s+(?:professional\s+)?work\s+experience/i,
    /(\d+(?:\.\d+)?)\s*years?\s+(?:of\s+)?experience/i,
    /(?:possessing\s+)?(?:over\s+)?(\d+(?:\.\d+)?)\s*years?\s+of\s+experience/i,
    /approximately?\s+(\d+(?:\.\d+)?)\s*years?\s+of\s+(?:professional\s+)?experience/i,
    /around?\s+(\d+(?:\.\d+)?)\s*years?\s+of\s+experience/i,
  ];

  for (const pattern of summaryExperiencePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      const yearsValue = parseFloat(match[1]);
      if (!isNaN(yearsValue) && yearsValue > 0 && yearsValue < 100) {
        // Convert decimal years to "X years Y months" format
        const years = Math.floor(yearsValue);
        const months = Math.round((yearsValue - years) * 12);
        
        if (years === 0 && months === 0) return "< 1 month";
        if (years === 0) return months === 1 ? `${months} month` : `${months} months`;
        if (months === 0) return years === 1 ? `${years} year` : `${years} years`;
        
        const yearText = years === 1 ? "year" : "years";
        const monthText = months === 1 ? "month" : "months";
        return `${years} ${yearText} ${months} ${monthText}`;
      }
    }
  }

  // ✅ PRIORITY 2: If no summary experience found, calculate from job dates
  if (!experience || experience.length === 0) return "Fresher";

  let totalMonths = 0;
  let validJobs = 0;

  experience.forEach((exp: any) => {
    const startDate = parseDate(exp.startDate);
    const endDate = exp.endDate?.toLowerCase().includes("present")
      ? new Date()
      : parseDate(exp.endDate);

    if (startDate && endDate) {
      const months =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      if (months >= 0) {
        totalMonths += months;
        validJobs++;
      }
    }
  });

  // If no valid dates found
  if (validJobs === 0 || totalMonths < 0) return "Fresher";

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years === 0) {
    if (months === 0) return "< 1 month";
    return months === 1 ? `${months} month` : `${months} months`;
  }

  if (months === 0) {
    return years === 1 ? `${years} year` : `${years} years`;
  }

  const yearText = years === 1 ? "year" : "years";
  const monthText = months === 1 ? "month" : "months";
  return `${years} ${yearText} ${months} ${monthText}`;
}

// ✅ HELPER FUNCTION 3: Parse various date formats
// function parseDate(dateStr: string | null): Date | null {
//   if (!dateStr) return null;

//   if (dateStr.toLowerCase().includes("present")) return new Date();

//   const formats = [
//     /^(\w+)\s+(\d{4})$/,       // "June 2024"
//     /^(\d{2})\/(\d{4})$/,      // "04/2024"
//     /^(\d{4})-(\d{2})$/,       // "2024-06"
//   ];

//   for (const format of formats) {
//     const match = dateStr.match(format);
//     if (match) {
//       if (format === formats[0]) {
//         const months: Record<string, number> = {
//           january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
//           july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
//         };
//         const month = months[match[1].toLowerCase()];
//         const year = parseInt(match[2]);
//         return new Date(year, month);
//       } else if (format === formats[1]) {
//         return new Date(parseInt(match[2]), parseInt(match[1]) - 1);
//       } else if (format === formats[2]) {
//         return new Date(parseInt(match[1]), parseInt(match[2]) - 1);
//       }
//     }
//   }

//   return null;
// }

// ✅ HELPER FUNCTION 3: Parse various date formats (ENHANCED)
// function parseDate(dateStr: string | null): Date | null {
//   if (!dateStr) return null;

//   // Handle "Present", "present", "Current", "current"
//   if (dateStr.toLowerCase().includes("present") || dateStr.toLowerCase().includes("current")) {
//     return new Date();
//   }

//   // Normalize the string: trim, convert to lowercase, normalize dashes
//   const normalized = dateStr
//     .trim()
//     .toLowerCase()
//     .replace(/–/g, '-')  // Replace en dash with hyphen
//     .replace(/—/g, '-'); // Replace em dash with hyphen

//   const formats = [
//     // "June 2024", "june 2024", "JUNE 2024"
//     /^(\w+)\s+(\d{4})$/,
//     // "04/2024", "06/2023"
//     /^(\d{2})\/(\d{4})$/,
//     // "2024-06", "2023-04"
//     /^(\d{4})-(\d{2})$/,
//     // "06-2024", "04-2023"
//     /^(\d{2})-(\d{4})$/,
//   ];

//   const months: Record<string, number> = {
//     january: 0, jan: 0,
//     february: 1, feb: 1,
//     march: 2, mar: 2,
//     april: 3, apr: 3,
//     may: 4,
//     june: 5, jun: 5,
//     july: 6, jul: 6,
//     august: 7, aug: 7,
//     september: 8, sep: 8, sept: 8,
//     october: 9, oct: 9,
//     november: 10, nov: 10,
//     december: 11, dec: 11,
//   };

//   for (const format of formats) {
//     const match = normalized.match(format);
//     if (match) {
//       if (format === formats[0]) {
//         // Month name format (handles full and abbreviated months)
//         const monthStr = match[1].toLowerCase();
//         const month = months[monthStr];
//         const year = parseInt(match[2]);
        
//         if (month !== undefined && !isNaN(year)) {
//           return new Date(year, month);
//         }
//       } else if (format === formats[1]) {
//         // MM/YYYY format
//         const month = parseInt(match[1]) - 1;
//         const year = parseInt(match[2]);
//         if (!isNaN(month) && !isNaN(year) && month >= 0 && month <= 11) {
//           return new Date(year, month);
//         }
//       } else if (format === formats[2]) {
//         // YYYY-MM format
//         const year = parseInt(match[1]);
//         const month = parseInt(match[2]) - 1;
//         if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
//           return new Date(year, month);
//         }
//       } else if (format === formats[3]) {
//         // MM-YYYY format
//         const month = parseInt(match[1]) - 1;
//         const year = parseInt(match[2]);
//         if (!isNaN(month) && !isNaN(year) && month >= 0 && month <= 11) {
//           return new Date(year, month);
//         }
//       }
//     }
//   }

//   return null;
// }

// function parseDate(dateStr: string | null): Date | null {
//   if (!dateStr) return null;

//   // Handle "Present", "present", "Current", "current", "till date", "till now"
//   const presentKeywords = ["present", "current", "till date", "till now", "ongoing"];
//   if (presentKeywords.some(keyword => dateStr.toLowerCase().includes(keyword))) {
//     return new Date();
//   }

//   // Normalize the string: trim, convert to lowercase, normalize dashes
//   let normalized = dateStr
//     .trim()
//     .toLowerCase()
//     .replace(/–/g, '-')  // Replace en dash with hyphen
//     .replace(/—/g, '-')  // Replace em dash with hyphen
//     .replace(/\s+/g, ' ') // Normalize spaces
//     .trim();

//   // Handle date ranges like "June 2024 - August 2024" or "06/2024 - 08/2024"
//   // Extract only the END date from ranges
//   if (normalized.includes('-')) {
//     const parts = normalized.split('-');
//     if (parts.length >= 2) {
//       // Use the last part (end date)
//       normalized = parts[parts.length - 1].trim();
//     }
//   }

//   // Remove common prefixes like "from", "since", "to"
//   normalized = normalized.replace(/^(from|since|to)\s+/i, '');

//   const formats = [
//     // "June 2024", "june 2024", "JUNE 2024", "Jun 2024"
//     /^(\w+\.?)\s+(\d{4})$/,
//     // "04/2024", "06/2023"
//     /^(\d{2})\/(\d{4})$/,
//     // "2024-06", "2023-04"
//     /^(\d{4})-(\d{2})$/,
//     // "06-2024", "04-2023"
//     /^(\d{2})-(\d{4})$/,
//     // "2024", just year
//     /^(\d{4})$/,
//   ];

//   const months: Record<string, number> = {
//     january: 0, jan: 0, janua: 0,
//     february: 1, feb: 1, febru: 1,
//     march: 2, mar: 2,
//     april: 3, apr: 3,
//     may: 4,
//     june: 5, jun: 5,
//     july: 6, jul: 6,
//     august: 7, aug: 7,
//     september: 8, sep: 8, sept: 8,
//     october: 9, oct: 9,
//     november: 10, nov: 10,
//     december: 11, dec: 11,
//   };

//   for (const format of formats) {
//     const match = normalized.match(format);
//     if (match) {
//       if (format === formats[0]) {
//         // Month name format
//         const monthStr = match[1].toLowerCase().replace(/\.$/, ''); // Remove period if present
//         const month = months[monthStr];
//         const year = parseInt(match[2]);
        
//         if (month !== undefined && !isNaN(year) && year > 1900 && year < 2100) {
//           return new Date(year, month);
//         }
//       } else if (format === formats[1]) {
//         // MM/YYYY format
//         const month = parseInt(match[1]) - 1;
//         const year = parseInt(match[2]);
//         if (!isNaN(month) && !isNaN(year) && month >= 0 && month <= 11 && year > 1900 && year < 2100) {
//           return new Date(year, month);
//         }
//       } else if (format === formats[2]) {
//         // YYYY-MM format
//         const year = parseInt(match[1]);
//         const month = parseInt(match[2]) - 1;
//         if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11 && year > 1900 && year < 2100) {
//           return new Date(year, month);
//         }
//       } else if (format === formats[3]) {
//         // MM-YYYY format
//         const month = parseInt(match[1]) - 1;
//         const year = parseInt(match[2]);
//         if (!isNaN(month) && !isNaN(year) && month >= 0 && month <= 11 && year > 1900 && year < 2100) {
//           return new Date(year, month);
//         }
//       } else if (format === formats[4]) {
//         // Just year - assume January
//         const year = parseInt(match[1]);
//         if (!isNaN(year) && year > 1900 && year < 2100) {
//           return new Date(year, 0); // January
//         }
//       }
//     }
//   }

//   return null;
// }


function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;

  // Handle "Present", "present", "Current", "current", "till date", "till now"
  const presentKeywords = ["present", "current", "till date", "till now", "ongoing"];
  if (presentKeywords.some(keyword => dateStr.toLowerCase().includes(keyword))) {
    return new Date();
  }

  // Normalize the string
  let normalized = dateStr
    .trim()
    .toLowerCase()
    .replace(/–/g, '-')  // Replace en dash with hyphen
    .replace(/—/g, '-')  // Replace em dash with hyphen
    .replace(/\s+/g, ' ')
    .trim();

  // Handle date ranges - extract end date
  if (normalized.includes('-')) {
    const parts = normalized.split('-');
    if (parts.length >= 2) {
      normalized = parts[parts.length - 1].trim();
    }
  }

  // Remove common prefixes
  normalized = normalized.replace(/^(from|since|to)\s+/i, '');

  const formats = [
    /^(\w+\.?)\s+(\d{4})$/,      // "June 2024"
    /^(\d{2})\/(\d{4})$/,        // "04/2024"
    /^(\d{4})-(\d{2})$/,         // "2024-06"
    /^(\d{2})-(\d{4})$/,         // "06-2024"
    /^(\d{4})$/,                 // "2024"
  ];

  const months: Record<string, number> = {
    january: 0, jan: 0, janua: 0,
    february: 1, feb: 1, febru: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };

  for (const format of formats) {
    const match = normalized.match(format);
    if (match) {
      if (format === formats[0]) {
        const monthStr = match[1].toLowerCase().replace(/\.$/, '');
        const month = months[monthStr];
        const year = parseInt(match[2]);
        
        if (month !== undefined && !isNaN(year) && year > 1900 && year < 2100) {
          return new Date(year, month);
        }
      } else if (format === formats[1]) {
        const month = parseInt(match[1]) - 1;
        const year = parseInt(match[2]);
        if (!isNaN(month) && !isNaN(year) && month >= 0 && month <= 11 && year > 1900 && year < 2100) {
          return new Date(year, month);
        }
      } else if (format === formats[2]) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11 && year > 1900 && year < 2100) {
          return new Date(year, month);
        }
      } else if (format === formats[3]) {
        const month = parseInt(match[1]) - 1;
        const year = parseInt(match[2]);
        if (!isNaN(month) && !isNaN(year) && month >= 0 && month <= 11 && year > 1900 && year < 2100) {
          return new Date(year, month);
        }
      } else if (format === formats[4]) {
        const year = parseInt(match[1]);
        if (!isNaN(year) && year > 1900 && year < 2100) {
          return new Date(year, 0);
        }
      }
    }
  }

  return null;
}

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

      const allowedTypes = [
        "application/pdf",
        "message/rfc822",
        "application/octet-stream",
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

      const maxSize = 10 * 1024 * 1024;
      const oversizedFiles = files.filter((f) => f.size > maxSize);
      if (oversizedFiles.length > 0) {
        return res.status(400).json({
          error: "File size exceeds 10MB limit.",
        });
      }

      const file = files[0];
      
      const processed = await processFile(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      if (mode === "manual") {
        return res.json({
          success: true,
          rawText: processed.text,
          attachments: processed.attachments,
          filename: file.originalname,
        });
      } else if (mode === "ai" && autoExtract) {
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

      if (!extractedData) {
        console.error("❌ extractResumeData returned nothing!");
        return res.status(500).json({ error: "No data returned from extraction" });
      }

      res.json(extractedData);
      console.log("🏁 END /api/extract - SUCCESS");
    } catch (error) {
      console.error("💥 CAUGHT ERROR:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Extraction failed",
      });
    }
  });

  // POST /api/extract/manual - Save manually extracted data
  app.post("/api/extract/manual", async (req, res) => {
    try {
      const data = {
        fullName: req.body.fullName || null,
        emails: Array.isArray(req.body.emails)
          ? req.body.emails.filter((e: string) => e && e.trim())
          : [],
        phones: Array.isArray(req.body.phones)
  ? req.body.phones.filter((p: string) => p && p.trim())  // ✅ CORRECT - use 'p'
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

  // ✅ ENHANCED GET /api/export - Export candidates to Excel
  app.get("/api/export", async (req, res) => {
    try {
      const format = req.query.format || "xlsx";
      const candidates = await storage.getCandidates();

      if (format === "xlsx") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Candidates", {
          properties: { tabColor: { argb: "FF21808D" } },
        });

        // ✅ ENHANCED COLUMNS
        worksheet.columns = [
          { header: "Full Name", key: "fullName", width: 25 },
          { header: "Email", key: "email", width: 30 },
          { header: "Phone", key: "phone", width: 18 },
          { header: "Current Position", key: "currentPosition", width: 30 },
          { header: "Current Company", key: "currentCompany", width: 30 },
          { header: "Previous Company", key: "previousCompany", width: 30 },
          { header: "Total Experience", key: "totalExperience", width: 18 },
          { header: "Skills", key: "skills", width: 50 },
          { header: "Certifications", key: "certifications", width: 40 },
          { header: "LinkedIn", key: "linkedin", width: 40 },
          { header: "GitHub", key: "github", width: 40 },
          { header: "Portfolio", key: "portfolio", width: 40 },
          { header: "Summary", key: "summary", width: 60 },
          { header: "Confidence", key: "confidence", width: 12 },
          { header: "Source File", key: "sourceFile", width: 30 },
          { header: "Extracted At", key: "extractedAt", width: 20 },
        ];

        // ✅ STYLE HEADER ROW
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF21808D" },
        };
        headerRow.alignment = { vertical: "middle", horizontal: "center" };
        headerRow.height = 25;

        // ✅ ADD DATA ROWS
        if (candidates && candidates.length > 0) {
          candidates.forEach((candidate, index) => {
            const urls = extractUrls(candidate.rawText || null);
            const totalExp = calculateTotalExperience(candidate);
            const currentJob = candidate.experience?.[0];
            const previousJob = candidate.experience?.[1];

            const row = worksheet.addRow({
              fullName: candidate.fullName || "N/A",
              email: candidate.emails?.[0] || "N/A",
              phone: candidate.phones?.[0] || "N/A",
              currentPosition: currentJob?.title || "N/A",
              currentCompany: currentJob?.company || "N/A",
              previousCompany: previousJob?.company || "N/A",
              totalExperience: totalExp,
              skills: candidate.skills?.join(", ") || "N/A",
              certifications:
                candidate.certifications
                  ?.map((cert) => cert.name)
                  .join(", ") || "N/A",
              linkedin: urls.linkedin || "N/A",
              github: urls.github || "N/A",
              portfolio: urls.portfolio || "N/A",
              summary: candidate.summary || "N/A",
              confidence: candidate.confidence?.overall
                ? `${(candidate.confidence.overall * 100).toFixed(0)}%`
                : "N/A",
              sourceFile: candidate.sourceFile || "N/A",
              extractedAt: new Date(candidate.extractedAt).toLocaleString(),
            });

            // ✅ ALTERNATING ROW COLORS
            if (index % 2 === 0) {
              row.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF5F5F5" },
              };
            }

            row.alignment = { vertical: "top", wrapText: true };
            row.height = 30;

            // ✅ CLICKABLE URLS
            if (urls.linkedin && urls.linkedin !== "N/A") {
              const linkedinCell = row.getCell("linkedin");
              linkedinCell.value = {
                text: urls.linkedin,
                hyperlink: urls.linkedin,
              };
              linkedinCell.font = { color: { argb: "FF0066CC" }, underline: true };
            }

            if (urls.github && urls.github !== "N/A") {
              const githubCell = row.getCell("github");
              githubCell.value = {
                text: urls.github,
                hyperlink: urls.github,
              };
              githubCell.font = { color: { argb: "FF0066CC" }, underline: true };
            }

            if (urls.portfolio && urls.portfolio !== "N/A") {
              const portfolioCell = row.getCell("portfolio");
              portfolioCell.value = {
                text: urls.portfolio,
                hyperlink: urls.portfolio,
              };
              portfolioCell.font = { color: { argb: "FF0066CC" }, underline: true };
            }
          });
        }

        // ✅ BORDERS
        worksheet.eachRow((row) => {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin", color: { argb: "FFD0D0D0" } },
              left: { style: "thin", color: { argb: "FFD0D0D0" } },
              bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
              right: { style: "thin", color: { argb: "FFD0D0D0" } },
            };
          });
        });

        // ✅ FREEZE HEADER
        worksheet.views = [{ state: "frozen", ySplit: 1 }];

        // ✅ AUTO-FILTER
        worksheet.autoFilter = {
          from: "A1",
          to: "P1",
        };

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=candidates-export-${new Date().toISOString().split("T")[0]}.xlsx`
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

  // ✅ DELETE /api/candidates/:id - Delete single candidate
  app.delete("/api/candidates/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteCandidate(req.params.id);

      if (!deleted) {
        res.setHeader("Content-Type", "application/json");
        return res.status(404).json({
          success: false,
          error: "Candidate not found",
        });
      }

      res.setHeader("Content-Type", "application/json");
      res.status(200).json({
        success: true,
        message: "Candidate deleted successfully",
        id: req.params.id,
      });
    } catch (error) {
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete candidate",
      });
    }
  });

  // ✅ DELETE /api/candidates - Delete all candidates
  app.delete("/api/candidates", async (req: Request, res: Response) => {
    try {
      const count = await storage.deleteAllCandidates();

      res.setHeader("Content-Type", "application/json");
      res.status(200).json({
        success: true,
        message: "All candidates deleted successfully",
        deletedCount: count,
      });
    } catch (error) {
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete all candidates",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}