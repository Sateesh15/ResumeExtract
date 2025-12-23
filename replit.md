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
- **Authentication**: MSAL (Microsoft Authentication Library) with Azure AD integration

### Backend
- **Runtime**: Node.js 20 with TypeScript
- **Framework**: Express.js
- **File Upload**: Multer with memory storage
- **PDF Processing**: pdf-parse with text extraction
- **Email Processing**: mailparser for EML file handling
- **AI Integration**: OpenAI API (gpt-5o-mini model)
- **Excel Export**: ExcelJS with advanced formatting
- **Storage**: In-memory (MemStorage) for MVP
- **Authentication**: express-jwt with JWKS-RSA (Azure AD token validation)
- **Security**: JWT validation with domain-based access control

### Development
- **Build Tool**: Vite
- **TypeScript**: Full type safety with shared schemas
- **Testing**: data-testid attributes for E2E testing
- **Environment**: Dual .env support (client and server)

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

### 1. Authentication & Security
- **Azure AD Integration**: OAuth 2.0 with MSAL (Microsoft Authentication Library)
- **JWT Token Validation**: Express-JWT with JWKS-RSA for token verification
- **Dual Issuer Support**: Accepts both v1.0 and v2.0 Azure AD token formats
- **Domain-Based Access Control**: Restricts access to @iwebte.com domain users
- **Token Logging**: Enhanced debugging with token claims extraction and validation
- **Audience Validation**: Supports multiple token audience formats (GUID, api://, https://)

### 2. File Upload & Processing
- **Drag-and-drop Interface**: Intuitive file upload with visual feedback
- **Multi-Format Support**: PDF (text + scanned with OCR), EML (email with attachments)
- **Recursive Processing**: Handles PDF attachments within email messages
- **File Validation**: Type, size, and content validation (max 10MB per file)
- **Bulk Upload with Filtering**: Process multiple resumes with skill/position/experience filters
- **Rejected Resume Recovery**: Option to save filtered-out candidates anyway
- **Real-time Progress**: Upload status tracking and error reporting

### 3. Manual Extractor
- **Two-Column Layout**: Raw text preview + interactive field mapping form
- **Workflow**: Upload → Extract text → Map fields manually → Save
- **Editable Fields**: Name, emails, phones, skills, summary, education, experience
- **Sticky Action Bar**: Quick access to Save, Clear, and Export buttons
- **Real-time Validation**: Inline field validation with error messages
- **URL Extraction**: Auto-detects LinkedIn, GitHub, and portfolio URLs

### 4. AI Agent Extractor
- **Automatic Extraction**: OpenAI GPT-5o-mini for structured data extraction
- **Confidence Scoring**: Per-field and overall confidence (0-100%)
- **Smart Filtering**: Adjustable confidence threshold slider
- **Auto-Extract Toggle**: Immediate processing on upload
- **Search & Filter**: Find candidates by name, email, or phone
- **Flagging System**: Mark low-confidence candidates for re-extraction
- **Card-Based UI**: Intuitive result display with detailed modal view
- **Experience Calculation**: Intelligent parsing of years from summary or job dates
- **Multi-pass Deep Extraction**: Enhanced analysis for flagged records

### 5. Bulk Upload with Filtering
- **Batch Processing**: Upload and process multiple resumes simultaneously
- **Smart Filtering**: Filter by skills (AND/OR), position, and experience range
- **Acceptance/Rejection**: Auto-accept matching candidates, offer save option for rejected
- **Bulk Save**: Process multiple files with consistent filtering criteria
- **Error Handling**: Graceful error recovery per file with detailed feedback
- **Results Summary**: Shows matched count, rejected count, and per-file status

### 6. Candidate Management
- **Detail Modal**: Comprehensive candidate information view with inline editing
- **Multi-Value Fields**: Support multiple emails, phones, and skills per candidate
- **Full History**: Track education, experience, and certifications
- **Metadata Display**: Source file, extraction timestamp, mode, and confidence scores
- **Quick Edit**: Update and save candidate information without page reload
- **Flagging Mechanism**: Re-extract with deeper analysis on demand
- **Bulk Operations**: Delete single or all candidates in one action
- **Advanced Filtering**: Filter and export candidates by multiple criteria

### 7. Data Export
- **Excel Export (.xlsx)**:
  - Formatted headers with professional styling
  - Alternating row colors for readability
  - Clickable URLs for LinkedIn/GitHub/Portfolio profiles
  - Frozen header row with auto-filter enabled
  - 16 columns: Name, Email, Phone, Position, Company, Experience, Skills, Certifications, URLs, Summary, Confidence, Source, Date
  - Individual and batch export options
- **Filtered Export**: Export only matching candidates from filter results
- **Timestamp Naming**: Files automatically named with extraction date
- **Dynamic Content**: Includes all extracted fields and confidence metadata

### 8. Dashboard
- **Statistics Cards**: Total candidates, flagged count, completed/processing jobs
- **Recent Uploads**: Table showing latest extracted candidates with key info
- **Quick Navigation**: Shortcut cards to Manual and AI extractors
- **Job Queue**: Real-time job status tracking and history
- **Empty States**: Helpful prompts when no data available

## API Endpoints

### Authentication
- `GET /auth/login` - Initiate Azure AD login flow (handled by MSAL client-side)
- `POST /auth/logout` - Logout and clear session (handled by MSAL client-side)
- JWT validation on all protected endpoints via express-jwt middleware

### File Upload & Processing
- `POST /api/upload` - Upload and process PDF/EML files (mode: manual|ai, autoExtract flag)
- `POST /api/candidates/bulk-upload-filter` - Bulk upload with smart filtering by skills/position/experience

### Candidate Management (All require JWT token with domain validation)
- `GET /api/candidates` - List all candidates (paginated, sorted by extraction date)
- `GET /api/candidates/:id` - Get single candidate with full details
- `POST /api/candidates/:id` - Update candidate information (inline editing)
- `POST /api/candidates/:id/flag` - Flag candidate and trigger re-extraction with deeper analysis
- `POST /api/candidates/save-force` - Save rejected candidate despite filter mismatch
- `DELETE /api/candidates/:id` - Delete single candidate
- `DELETE /api/candidates` - Delete all candidates in one action

### Filtering & Export
- `POST /api/candidates/filter` - Filter candidates by skills (AND/OR mode), position, experience range
- `POST /api/export-filtered` - Export filtered candidates to Excel
- `GET /api/export?format=xlsx` - Export all candidates to Excel

### Extraction
- `POST /api/extract` - General extraction endpoint with AI processing
- `POST /api/extract/ai` - Run AI extraction on provided text
- `POST /api/extract/manual` - Save manually mapped candidate data

### Jobs (Async processing)
- `GET /api/jobs` - List all extraction jobs with status
- `GET /api/jobs/:id` - Get specific job status and progress details

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
  deleted?: boolean;
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

### Client Environment (.env in root or .env.local)
```
VITE_AZURE_CLIENT_ID=<your-azure-client-id>
VITE_AZURE_TENANT_ID=<your-azure-tenant-id>
VITE_REDIRECT_URI=http://localhost:3000
VITE_API_SCOPE=api://<your-client-id>/access
```

### Server Environment (.env in server root)
```
OPENAI_API_KEY=sk-proj-<your-openai-key>
SESSION_SECRET=<auto-generated-secure-secret>
PORT=5000

AZURE_OPENAI_API_KEY=<optional-azure-openai-key>
AZURE_OPENAI_ENDPOINT=<optional-azure-endpoint>

AZURE_TENANT_ID=<your-azure-tenant-id>
AZURE_CLIENT_ID=<your-azure-client-id>
```

### Azure AD Configuration
- **Tenant ID**: 604aebc4-9926-4009-9333-43f333827c56
- **Client ID**: 5b21943f-59c2-4cf9-ad62-056b6302e168
- **Allowed Domain**: @iwebte.com
- **Redirect URI**: http://localhost:3000 (or production URL)
- **Exposed API Scope**: api://5b21943f-59c2-4cf9-ad62-056b6302e168/access

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

## Authentication & Security Implementation

### Azure AD Integration
- **OAuth 2.0 Flow**: Handled by MSAL (Microsoft Authentication Library)
- **Token Endpoints**: Uses v2.0 endpoint for both ID and access tokens
- **Scopes Requested**: `User.Read openid profile email api://client-id/access`
- **Redirect Flow**: Azure AD → Client → API with access token

### Backend JWT Validation
- **Library**: express-jwt with jwks-rsa for key verification
- **Key Source**: JWKS endpoint from Azure AD (https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys)
- **Token Signature**: RSA-256 algorithm verification
- **Issuers Accepted**: Both v1.0 and v2.0 Azure AD issuer URLs
- **Audiences Accepted**: Client ID in GUID, `api://client-id`, or `https://client-id` formats
- **Cache**: JWKS keys cached with rate limiting enabled

### Middleware Chain
1. **logAuthRequest**: Logs incoming Authorization header (no validation)
2. **checkJwtWithLogging**: Verifies JWT signature, decodes claims, logs token metadata
3. **validateDomain**: Checks user email domain matches @iwebte.com
4. **extractUserInfo**: Extracts user context (email, name, OID) for audit trails

### Token Claims Extracted
```json
{
  "aud": "5b21943f-59c2-4cf9-ad62-056b6302e168",
  "scp": "api://client-id/access",
  "upn": "user@iwebte.com",
  "name": "User Name",
  "oid": "user-object-id",
  "iss": "https://login.microsoftonline.com/tenant-id/v2.0"
}
```

### Client-Side Token Management
- **Acquisition**: `acquireTokenSilent()` for cached tokens, `acquireTokenPopup()` for fresh tokens
- **Scope**: api://client-id/access (exposes API scope configured in Azure AD)
- **Storage**: Session storage (cleared on browser close)
- **Retry Logic**: Automatic retry with exponential backoff
- **Error Handling**: Graceful fallback to login on token expiry

## Recent Changes

### December 2025 Updates
- ✅ **Azure AD Authentication**: Full OAuth 2.0 integration with MSAL
  - Token validation via express-jwt + JWKS-RSA
  - Domain-based access control (@iwebte.com)
  - Support for dual Azure AD issuer formats (v1.0 and v2.0)
  - Enhanced token logging for debugging
  
- ✅ **Bulk Upload with Filtering**: Smart batch processing
  - Process multiple resumes simultaneously
  - Filter by skills (AND/OR mode), position, experience range
  - Auto-save matching candidates
  - Option to save rejected candidates anyway
  - Per-file status tracking and error handling
  
- ✅ **Save Force Endpoint**: Recovery mechanism
  - Allows saving candidates that don't match filter criteria
  - Tracks rejection reason for audit trail
  - Preserves all extracted data despite filter mismatch
  
- ✅ **Enhanced Token Handling**:
  - Automatic token acquisition with fallback to popup
  - Retry logic for silent token acquisition
  - Token payload logging (aud, scp claims)
  - Multi-audience format support
  
- ✅ **Improved URL Extraction**:
  - Enhanced regex patterns for LinkedIn profiles
  - GitHub username extraction with path handling
  - Portfolio URL detection with domain filtering
  
- ✅ **Smart Experience Calculation**:
  - Parses decimal years (e.g., "3.9 years") from summary
  - Falls back to job date calculation
  - Handles "Fresher" and "N/A" states
  - Supports multiple date formats

- ✅ **Advanced Excel Export**:
  - 16-column professional template
  - Clickable URLs with proper formatting
  - Alternating row colors for readability
  - Frozen header with auto-filter
  - Per-candidate confidence percentages
  - Filtered export with candidateIds selection

### November 14, 2025: Initial MVP
- Created complete schema with Zod validation for MemStorage
- Built all frontend pages and reusable components
- Implemented backend API with PDF/EML processing
- Integrated OpenAI GPT-5o-mini for AI extraction
- Added Excel export functionality
- Fixed pdf-parse ESM import issue
- Added file validation and security measures

## User Workflows

### Login & Authentication
1. User visits application (unauthenticated)
2. Redirected to Login page with "Sign in with Microsoft" button
3. MSAL handles OAuth 2.0 flow with Azure AD
4. Token acquired with api://client-id/access scope
5. Token validated on backend via express-jwt + JWKS
6. Access granted to @iwebte.com domain users only
7. Dashboard loaded with candidate list and stats

### Manual Extraction Flow
1. Authenticate with Azure AD
2. Navigate to Manual Extractor page
3. Upload PDF or EML file (drag-and-drop or click)
4. Raw text displayed in left panel (with formatting preserved)
5. Manually map extracted text to form fields (right panel)
6. Add/remove emails, phones, skills as needed
7. Review extracted URLs (LinkedIn, GitHub, Portfolio)
8. Click "Save Candidate" to persist to database
9. Optionally export to Excel or extract another file

### AI Extraction Flow (Auto-Extract)
1. Authenticate with Azure AD
2. Navigate to AI Extractor page
3. Toggle "Auto-Extract on Upload" ON
4. Upload PDF or EML file
5. OpenAI GPT-5o-mini processes file in real-time
6. Results displayed with confidence scores per field
7. Review AI-extracted candidate data in card view
8. Adjust confidence threshold slider to filter low-quality extractions
9. Click candidate card for detailed modal view
10. Edit fields inline if corrections needed
11. Flag low-confidence records for deeper re-extraction
12. Export all/filtered candidates to Excel

### Bulk Upload with Filtering
1. Authenticate with Azure AD
2. Navigate to Bulk Upload page
3. Define filter criteria: skills (AND/OR), position keywords, experience range
4. Upload multiple PDF/EML files at once
5. System processes each file and tests against filters
6. Matched candidates auto-saved to database
7. Rejected candidates displayed with rejection reason
8. Option to "Save Anyway" if needed (tracks rejection reason)
9. Summary shows total, matched, rejected counts per-file
10. Export results to Excel for review

### Candidate Management
1. View all candidates on Dashboard
2. Click candidate card to open detail modal
3. Edit any field inline (name, emails, phones, skills, etc.)
4. Save changes instantly
5. Flag candidate to trigger re-extraction with deeper analysis
6. View source file, extraction mode, timestamp, confidence scores
7. Delete single candidate or all candidates in one action

### Data Export
1. After extraction/filtering, click "Export to Excel"
2. File generated with professional formatting
3. Includes all 16 candidate fields
4. URLs formatted as clickable hyperlinks
5. Confidence scores shown as percentages
6. File auto-named with today's date: `candidates-export-YYYY-MM-DD.xlsx`
7. Open in Excel/Sheets for further analysis or import to other systems

## Future Enhancements (Post-MVP)
- ✅ **Completed in Latest Update**:
  - Azure AD authentication with OAuth 2.0
  - Bulk upload with smart filtering
  - Domain-based access control
  - Enhanced JWT validation and logging
  - Save-force endpoint for rejected candidates
  - Improved URL extraction patterns
  - Smart experience calculation from summary

- **Planned Enhancements**:
  - CSV and JSON export formats in addition to Excel
  - Per-resume summary file generation (.txt or .md)
  - ZIP file upload with recursive batch processing
  - Admin dashboard with extraction statistics and audit logs
  - Audit trail for tracking edits, verifications, and user actions
  - Real-time job queue with BullMQ and Redis
  - OCR support for scanned PDFs (Tesseract.js or AWS Textract)
  - Advanced candidate filtering, deduplication, and analytics
  - Webhook support for third-party integrations
  - Rate limiting and API usage tracking per user
  - Candidate matching/scoring against job descriptions
  - Email notification system for extraction completion
  - Role-based access control (recruiter, HR manager, admin)
  - Automated resume quality scoring and feedback
  - Multi-language support for resume processing
