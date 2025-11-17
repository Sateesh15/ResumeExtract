import { AzureOpenAI } from "openai";

console.log("🔍 Azure OpenAI loading...");
console.log("🔑 API Key present:", !!process.env.AZURE_OPENAI_API_KEY);
console.log("🔑 Endpoint:", process.env.AZURE_OPENAI_ENDPOINT);
console.log("🔑 Deployment:", process.env.AZURE_OPENAI_DEPLOYMENT_NAME);

const apiKey = process.env.AZURE_OPENAI_API_KEY ;
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

if (!apiKey || !endpoint || !deployment) {
  console.error("❌ FATAL: Azure OpenAI environment variables missing!");
  throw new Error("Missing Azure OpenAI config");
}

console.log("✅ Creating Azure OpenAI client...");

export const openai = new AzureOpenAI({
  apiKey: apiKey,
  endpoint: endpoint,
  deployment: deployment,
  apiVersion: apiVersion,
});

console.log("✅ Azure OpenAI client ready!");

interface ExtractedData {
  fullName: string | null;
  emails: string[];
  phones: string[];
  summary: string | null;
  education: any[];
  experience: any[];
  skills: string[];
  certifications: any[];
  confidence: any;
}

export async function extractResumeData(
  text: string,
  filename: string
): Promise<ExtractedData> {
  console.log("🤖 [AZURE] Starting extraction...");
  
  try {
    console.log("📤 [AZURE] Calling Azure OpenAI...");
    
    const prompt = `You are an expert resume parser. Extract structured information from the following resume text and return it as JSON.

Resume text:
${text.slice(0, 8000)}

Return a JSON object with this exact structure:
{
  "fullName": "string or null",
  "emails": ["array of emails"],
  "phones": ["array of phones"],
  "summary": "professional summary or null",
  "education": [{"degree": "", "institution": "", "graduationDate": "", "field": ""}],
  "experience": [{"title": "", "company": "", "startDate": "", "endDate": "", "description": ""}],
  "skills": ["array of skills"],
  "certifications": [{"name": "", "issuer": "", "date": ""}],
  "confidence": {"overall": 0.0-1.0, "name": 0.0-1.0, "emails": 0.0-1.0, "phones": 0.0-1.0, "education": 0.0-1.0, "experience": 0.0-1.0, "skills": 0.0-1.0}
}

Rules:
- Extract only information clearly present in the text
- Use null for missing single values, empty arrays for missing lists
- Validate emails and phones for proper format
- Return valid JSON only`;

    const response = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a resume parsing expert. Return only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "",
      response_format: { type: "json_object" },
      max_tokens: 2048,
    });

    console.log("✅ [AZURE] Response received");

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content in response");

    const parsed = JSON.parse(content);
    
    console.log("✅ [AZURE] Extraction successful:", {
      name: parsed.fullName,
      emails: parsed.emails?.length || 0,
      skills: parsed.skills?.length || 0,
    });

    return {
      fullName: parsed.fullName || null,
      emails: parsed.emails || [],
      phones: parsed.phones || [],
      summary: parsed.summary || null,
      education: parsed.education || [],
      experience: parsed.experience || [],
      skills: parsed.skills || [],
      certifications: parsed.certifications || [],
      confidence: parsed.confidence || { overall: 0.5 },
    };
  } catch (error) {
    console.error("❌ [AZURE] ERROR:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}
