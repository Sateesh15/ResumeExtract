import OpenAI from "openai";
import type { ConfidenceScores } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ExtractedData {
  fullName: string | null;
  emails: string[];
  phones: string[];
  summary: string | null;
  education: Array<{
    degree: string;
    institution: string;
    graduationDate?: string;
    field?: string;
  }>;
  experience: Array<{
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  skills: string[];
  certifications: Array<{
    name: string;
    issuer?: string;
    date?: string;
  }>;
  confidence: ConfidenceScores;
}

export async function extractResumeData(
  text: string,
  filename: string
): Promise<ExtractedData> {
  const prompt = `You are an expert resume parser. Extract structured information from the following resume text and return it as JSON.

Resume text:
${text.slice(0, 8000)}

Return a JSON object with this exact structure:
{
  "fullName": "string or null",
  "emails": ["array of email addresses"],
  "phones": ["array of phone numbers"],
  "summary": "professional summary or null",
  "education": [
    {
      "degree": "degree name",
      "institution": "school name",
      "graduationDate": "date or undefined",
      "field": "field of study or undefined"
    }
  ],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "startDate": "start date or undefined",
      "endDate": "end date or undefined",
      "description": "job description or undefined"
    }
  ],
  "skills": ["array of skills"],
  "certifications": [
    {
      "name": "certification name",
      "issuer": "issuing organization or undefined",
      "date": "date or undefined"
    }
  ],
  "confidence": {
    "overall": 0.0-1.0,
    "name": 0.0-1.0,
    "emails": 0.0-1.0,
    "phones": 0.0-1.0,
    "education": 0.0-1.0,
    "experience": 0.0-1.0,
    "skills": 0.0-1.0
  }
}

Rules:
- Extract only information that is clearly present in the text
- Use null for missing single values, empty arrays for missing lists
- Validate emails and phone numbers for proper format
- Confidence scores should reflect how certain you are about each extraction (0.0 = very uncertain, 1.0 = very certain)
- Overall confidence should be the average of all field confidences
- Return valid JSON only, no markdown or explanations`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content:
            "You are a resume parsing expert. Return only valid JSON matching the specified structure.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    const parsed = JSON.parse(content) as ExtractedData;

    // Validate and normalize the response
    return {
      fullName: parsed.fullName || null,
      emails: Array.isArray(parsed.emails) ? parsed.emails.filter(e => e && validateEmail(e)) : [],
      phones: Array.isArray(parsed.phones) ? parsed.phones.filter(p => p) : [],
      summary: parsed.summary || null,
      education: Array.isArray(parsed.education) ? parsed.education : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      confidence: {
        overall: Math.max(0, Math.min(1, parsed.confidence?.overall || 0.5)),
        name: parsed.confidence?.name,
        emails: parsed.confidence?.emails,
        phones: parsed.confidence?.phones,
        education: parsed.confidence?.education,
        experience: parsed.confidence?.experience,
        skills: parsed.confidence?.skills,
      },
    };
  } catch (error) {
    console.error("AI extraction error:", error);
    // Re-throw the error to be handled by the route
    throw error;
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
