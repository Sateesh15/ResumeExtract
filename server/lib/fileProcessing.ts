import * as pdfParse from "pdf-parse";
import { simpleParser } from "mailparser";
import { type Attachment } from "@shared/schema";

export interface ProcessedFile {
  text: string;
  attachments: Attachment[];
}

export async function processPDF(buffer: Buffer, filename: string): Promise<ProcessedFile> {
  try {
    const data = await (pdfParse as any).default(buffer);
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
        if (att.contentType === "application/pdf" && att.content) {
          try {
            const pdfData = await (pdfParse as any).default(att.content);
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
        } else {
          // Store non-PDF attachments metadata
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
  } else {
    return {
      text: "",
      attachments: [],
    };
  }
}
