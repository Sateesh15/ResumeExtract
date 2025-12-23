import { PDFParse } from "pdf-parse";
import { simpleParser } from "mailparser";
import AdmZip from "adm-zip";
import mammoth from "mammoth";
import { type Attachment } from "@shared/schema";

export interface ProcessedFile {
  text: string;
  attachments: Attachment[];
}

export async function processPDF(buffer: Buffer, filename: string): Promise<ProcessedFile> {
  try {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    return {
      text: data.text,
      attachments: [],
    };
  } catch (error) {
    console.error("PDF processing error:", error);
    return {
      text: "",
      attachments: [],
    };
  }
}

export async function processDOCX(buffer: Buffer, filename: string): Promise<ProcessedFile> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result?.value || "";
    return {
      text,
      attachments: [],
    };
  } catch (error) {
    console.error("DOCX processing error:", error);
    return {
      text: "",
      attachments: [],
    };
  }
}

export async function processZIP(buffer: Buffer, filename: string): Promise<ProcessedFile> {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    let combinedText = "";
    const attachments: Attachment[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.isDirectory) continue;
      const name = entry.entryName;
      const data = entry.getData();

      if (name.toLowerCase().endsWith(".pdf")) {
        try {
          const parser = new PDFParse({ data });
          const pdfData = await parser.getText();
          combinedText += `\n\n[Attachment: ${name}]\n` + (pdfData.text || "");
          attachments.push({
            id: `zip-att-${i}`,
            filename: name,
            mimeType: "application/pdf",
            size: data.length,
            extractedText: pdfData.text || "",
            processed: true,
          });
        } catch (err) {
          console.error(`Error processing PDF in ZIP: ${name}`, err);
          attachments.push({
            id: `zip-att-${i}`,
            filename: name,
            mimeType: "application/pdf",
            size: data.length,
            extractedText: "",
            processed: false,
          });
        }
      } else if (name.toLowerCase().endsWith(".eml")) {
        try {
          const emlProcessed = await processEML(data, name);
          combinedText += `\n\n[Attachment: ${name}]\n` + emlProcessed.text;
          // flatten attachments from eml as nested attachments
          for (const a of emlProcessed.attachments) {
            attachments.push({ ...a, id: `zip-${a.id}` });
          }
        } catch (err) {
          console.error(`Error processing EML in ZIP: ${name}`, err);
          attachments.push({
            id: `zip-att-${i}`,
            filename: name,
            mimeType: "message/rfc822",
            size: data.length,
            extractedText: "",
            processed: false,
          });
        }
      } else if (name.toLowerCase().endsWith(".docx")) {
        try {
          const docxProcessed = await processDOCX(data, name);
          combinedText += `\n\n[Attachment: ${name}]\n` + docxProcessed.text;
          attachments.push({
            id: `zip-att-${i}`,
            filename: name,
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: data.length,
            extractedText: docxProcessed.text || "",
            processed: true,
          });
        } catch (err) {
          console.error(`Error processing DOCX in ZIP: ${name}`, err);
          attachments.push({
            id: `zip-att-${i}`,
            filename: name,
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: data.length,
            extractedText: "",
            processed: false,
          });
        }
      } else if (name.toLowerCase().endsWith(".doc")) {
        // DOC binary format is harder to parse reliably; just store metadata
        attachments.push({
          id: `zip-att-${i}`,
          filename: name,
          mimeType: "application/msword",
          size: data.length,
          extractedText: "",
          processed: false,
        });
      } else {
        // Unknown file types inside ZIP -> keep metadata
        attachments.push({
          id: `zip-att-${i}`,
          filename: name,
          mimeType: "application/octet-stream",
          size: data.length,
          extractedText: "",
          processed: false,
        });
      }
    }

    return {
      text: combinedText,
      attachments,
    };
  } catch (error) {
    console.error("ZIP processing error:", error);
    return {
      text: "",
      attachments: [],
    };
  }
}

export async function processEML(buffer: Buffer, filename: string): Promise<ProcessedFile> {
  try {
    const parsed = await simpleParser(buffer);

    let text = "";
    if (parsed.text) {
      text = parsed.text;
    } else if (parsed.html) {
      // Strip HTML tags for basic text extraction
      text = parsed.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }

    // Extract subject and from for context
    if (parsed.subject) {
      text = `Subject: ${parsed.subject}\n\n${text}`;
    }
    if (parsed.from) {
      const from = Array.isArray(parsed.from) ? parsed.from[0] : parsed.from;
      text = `From: ${from.text}\n${text}`;
    }

    const attachments: Attachment[] = [];

    if (parsed.attachments && parsed.attachments.length > 0) {
      for (let i = 0; i < parsed.attachments.length; i++) {
        const att = parsed.attachments[i];

        // Process PDF attachments
        if (att.content && att.contentType === "application/pdf") {
          try {
            const parser = new PDFParse({ data: att.content });
            const pdfData = await parser.getText();
            attachments.push({
              id: `att-${i}`,
              filename: att.filename || `attachment-${i}.pdf`,
              mimeType: att.contentType,
              size: att.size || att.content.length,
              extractedText: pdfData.text,
              processed: true,
            });
            // Append attachment text to main text
            text += `\n\n[Attachment: ${att.filename}]\n${pdfData.text}`;
          } catch (error) {
            console.error(`Error processing PDF attachment ${att.filename}:`, error);
            attachments.push({
              id: `att-${i}`,
              filename: att.filename || `attachment-${i}.pdf`,
              mimeType: att.contentType,
              size: att.size || att.content.length,
              extractedText: "",
              processed: false,
            });
          }

          continue;
        }

        // Process DOCX attachments
        if (att.content && (att.contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || (att.filename || "").toLowerCase().endsWith(".docx"))) {
          try {
            const docxData = await processDOCX(att.content, att.filename || `attachment-${i}.docx`);
            attachments.push({
              id: `att-${i}`,
              filename: att.filename || `attachment-${i}.docx`,
              mimeType: att.contentType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              size: att.size || att.content.length,
              extractedText: docxData.text || "",
              processed: true,
            });
            text += `\n\n[Attachment: ${att.filename}]\n${docxData.text}`;
          } catch (err) {
            console.error(`Error processing DOCX attachment ${att.filename}:`, err);
            attachments.push({
              id: `att-${i}`,
              filename: att.filename || `attachment-${i}.docx`,
              mimeType: att.contentType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              size: att.size || (att.content?.length || 0),
              extractedText: "",
              processed: false,
            });
          }

          continue;
        }

        // DOC (binary) attachments or other unknown types: store metadata only
        attachments.push({
          id: `att-${i}`,
          filename: att.filename || `attachment-${i}`,
          mimeType: att.contentType,
          size: att.size || (att.content?.length || 0),
          extractedText: "",
          processed: false,
        });
      }
    }

    return {
      text,
      attachments,
    };
  } catch (error) {
    console.error("EML processing error:", error);
    return {
      text: "",
      attachments: [],
    };
  }
}

export async function processFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ProcessedFile> {
  const lowerFilename = filename.toLowerCase();
  
  if (lowerFilename.endsWith(".pdf") || mimeType === "application/pdf") {
    return processPDF(buffer, filename);
  } else if (lowerFilename.endsWith(".eml") || mimeType === "message/rfc822") {
    return processEML(buffer, filename);
  } else if (lowerFilename.endsWith(".docx") || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return processDOCX(buffer, filename);
  } else if (lowerFilename.endsWith(".doc") || mimeType === "application/msword") {
    // Best-effort: DOC (binary) not processed here; return empty text but keep file metadata
    return {
      text: "",
      attachments: [],
    };
  } else if (lowerFilename.endsWith(".zip") || mimeType === "application/zip" || mimeType === "application/x-zip-compressed") {
    return processZIP(buffer, filename);
  } else {
    return {
      text: "",
      attachments: [],
    };
  }
}
