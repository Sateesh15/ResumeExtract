# PDF & EML Resume Extractor

## Overview
A comprehensive web application built with Node.js (Express) backend and React (TypeScript) frontend that automates resume data extraction from PDF and EML files. The system provides both manual field mapping and AI-assisted extraction workflows with confidence scoring, flagging mechanisms, and Excel export capabilities.

## Purpose
Built for recruiters, HR staff, and hiring managers to efficiently process and extract structured candidate information from resume files and email attachments, reducing manual data entry and improving candidate database quality.

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query v5)
- **UI Components**: Shadcn UI + Radix UI
- **Styling**: Tailwind CSS with Material Design principles
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 20 with TypeScript
- **Framework**: Express.js
- **File Upload**: Multer
- **PDF Processing**: pdf-parse
- **Email Processing**: mailparser (nodemailer)
- **AI Integration**: OpenAI API (gpt-5 model)
- **Excel Export**: ExcelJS
- **Storage**: In-memory (MemStorage) for MVP

### Development
- **Build Tool**: Vite
- **TypeScript**: Full type safety with shared schemas
- **Testing**: data-testid attributes for E2E testing

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/          # Shadcn base components
│   │   │   ├── FileUploadZone.tsx
│   │   │   ├── CandidateCard.tsx
│   │   │   ├── CandidateDetailModal.tsx
│   │   │   ├── ConfidenceBadge.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── pages/           # Page components
│   │   │   ├── Home.tsx               # Dashboard with stats
│   │   │   ├── ManualExtractor.tsx    # Manual field mapping
│   │   │   └── AIExtractor.tsx        # AI-assisted extraction
│   │   ├── lib/             # Utilities
│   │   └── App.tsx          # Main application with routing
├── server/
│   ├── lib/
│   │   ├── openai.ts        # AI extraction logic
│   │   └── fileProcessing.ts # PDF/EML parsing
│   ├── storage.ts           # In-memory data storage
│   ├── routes.ts            # API endpoints
│   └── index.ts             # Server entry point
└── shared/
    └── schema.ts            # Shared TypeScript types and Zod schemas
```

## Core Features

### 1. File Upload & Processing
- Drag-and-drop file upload interface
- Supports PDF resumes (text and scanned with OCR)
- Supports EML email files with automatic attachment extraction
- Recursive processing of PDF attachments within emails
- File validation (type and size limits)

### 2. Manual Extractor
- Two-column layout with raw text preview and field mapping form
- Upload → Extract text → Map fields manually → Save
- Editable fields: name, emails, phones, skills, summary
- Sticky action bar with Save, Clear, and Export buttons
- Real-time text extraction from uploaded files

### 3. AI Agent Extractor
- Automatic candidate information extraction using OpenAI gpt-5
- Confidence score display (0-100%) for overall and individual fields
- Confidence threshold slider to filter results
- Auto-extract toggle for immediate processing
- Search and filter candidates by name, email, or phone
- Flag mechanism for re-extraction with deeper analysis
- Card-based results display with detailed modal view

### 4. Candidate Management
- Comprehensive candidate detail modal with inline editing
- Support for multiple emails, phones, and skills per candidate
- Track education, experience, and certifications
- View extraction metadata (source file, timestamp, mode, confidence)
- Update and save candidate information
- Flag candidates for additional extraction passes

### 5. Data Export
- Excel (.xlsx) export with all candidate fields
- Formatted columns with headers
- Includes confidence scores, extraction mode, and flagged status
- Downloadable file with timestamp

### 6. Dashboard
- Statistics cards: Total candidates, Flagged count, Completed jobs, Processing jobs
- Recent uploads table with Name, Email, Phone, Source, Extracted date
- Quick action cards to navigate to Manual or AI extractors

## API Endpoints

### File Upload & Processing
- `POST /api/upload` - Upload and process PDF/EML files (with mode: manual|ai)

### Candidate Management
- `GET /api/candidates` - List all candidates (sorted by extraction date)
- `GET /api/candidates/:id` - Get single candidate details
- `POST /api/candidates/:id` - Update candidate information
- `POST /api/candidates/:id/flag` - Flag candidate and trigger re-extraction

### Extraction
- `POST /api/extract/manual` - Save manually mapped candidate data
- `POST /api/extract/ai` - Run AI extraction on provided text

### Jobs
- `GET /api/jobs` - List all extraction jobs
- `GET /api/jobs/:id` - Get job status and progress

### Export
- `GET /api/export?format=xlsx` - Export all candidates to Excel

## Data Model

### Candidate
```typescript
{
  id: string;
  fullName: string | null;
  emails: string[];
  phones: string[];
  summary: string | null;
  education: Education[];
  experience: Experience[];
  skills: string[];
  certifications: Certification[];
  attachments: Attachment[];
  sourceFile: string;
  extractedAt: string;
  confidence?: ConfidenceScores;
  flagged: boolean;
  extractionMode: "manual" | "ai";
  rawText?: string;
}
```

### AI Extraction Process
1. File uploaded → Text extracted from PDF/EML
2. Text sent to OpenAI gpt-5 with structured prompt
3. AI returns JSON with candidate fields + confidence scores
4. System validates emails, phones, normalizes data
5. Candidate saved to storage with metadata
6. User can review, edit, flag for re-extraction

## Environment Variables

Required secrets (configured via Replit Secrets):
- `OPENAI_API_KEY` - OpenAI API key for AI extraction
- `SESSION_SECRET` - Session secret for Express (auto-generated)

## Design System

### Colors
- Primary: Blue (hsl(217 91% 60%))
- Background: White (light) / Dark gray (dark mode)
- Professional enterprise color scheme

### Typography
- Font: Inter (sans-serif), Roboto Mono (monospace)
- Hierarchy: 3xl (30px) for titles, xl (20px) for sections, base (16px) for body

### Spacing
- Tight (2, 4): Form fields, list items
- Standard (4, 6): Cards, sections
- Generous (8, 12): Page sections

### Interactions
- Hover elevate utility for interactive elements
- Loading skeletons for data fetching
- Toast notifications for success/error feedback
- Smooth transitions and animations

## Recent Changes
- November 14, 2025: Initial MVP implementation
  - Created complete schema with Zod validation for MemStorage
  - Built all frontend pages and reusable components
  - Implemented backend API with PDF/EML processing
  - Integrated OpenAI gpt-5 for AI extraction
  - Added Excel export functionality
  - Fixed pdf-parse ESM import issue
  - Added file validation and security measures

## User Workflows

### Manual Extraction Flow
1. Navigate to Manual Extractor page
2. Upload PDF or EML file (drag-and-drop or click)
3. View extracted raw text in preview pane
4. Manually map fields in the form (right panel)
5. Add/remove emails, phones, skills as needed
6. Click "Save Candidate" to store data
7. Optionally export to Excel

### AI Extraction Flow
1. Navigate to AI Extractor page
2. Toggle "Auto-Extract on Upload" ON
3. Upload PDF or EML file
4. AI automatically extracts structured data
5. Review results in card view with confidence scores
6. Adjust confidence threshold slider to filter
7. Click candidate card to view/edit details
8. Flag low-confidence candidates for re-extraction
9. Export all candidates to Excel when done

## Future Enhancements (Post-MVP)
- PostgreSQL database for persistent storage
- CSV and JSON export formats
- Per-resume summary file generation (.txt or .md)
- ZIP file upload with batch processing
- Admin dashboard with extraction statistics
- Audit trail for tracking edits and verifications
- Multi-pass deep extraction for flagged records
- Confidence threshold settings and auto-accept workflows
- Real-time job queue with BullMQ and Redis
- OCR support for scanned PDFs (Tesseract.js)
