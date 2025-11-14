# Design Guidelines: PDF & EML Resume Extractor

## Design Approach

**System Selected**: Material Design / Ant Design hybrid  
**Rationale**: Enterprise productivity tool requiring data-dense layouts, complex forms, and table-heavy interfaces. These systems excel at information hierarchy and professional workflows.

**Key Principles**:
- Clarity over decoration: Every element serves a functional purpose
- Scannable data: Information must be quickly digestible
- Progressive disclosure: Complex features revealed when needed
- Consistent patterns: Repeated interactions across manual and AI workflows

---

## Typography System

**Font Stack**: Inter or Roboto via Google Fonts CDN

**Hierarchy**:
- Page titles: text-3xl font-semibold (30px)
- Section headers: text-xl font-semibold (20px)
- Card/panel titles: text-lg font-medium (18px)
- Body text: text-base font-normal (16px)
- Labels/metadata: text-sm font-medium (14px)
- Helper text/captions: text-xs (12px)

**Usage**: Maintain strict hierarchy - no jumping from xl to 3xl without intermediate steps.

---

## Layout System

**Spacing Units**: Tailwind units of **2, 4, 6, 8, 12, 16**
- Tight spacing (form fields, list items): gap-2, p-2
- Standard spacing (cards, sections): p-4, gap-4, mb-6
- Generous spacing (page sections): py-8, px-6, gap-8
- Major separations: mb-12, py-16

**Container Strategy**:
- Max content width: max-w-7xl mx-auto
- Full-width data tables: w-full with horizontal scroll on mobile
- Form columns: max-w-2xl for single-column forms
- Two-column layouts: grid-cols-1 lg:grid-cols-2 with gap-6

---

## Page-Specific Layouts

### Dashboard/Home Layout
- Top navigation bar: h-16 with logo, page tabs, user menu
- Main content: px-6 py-8
- Quick stats cards: grid-cols-1 md:grid-cols-3 gap-4, each card p-6 rounded-lg
- Recent uploads table below stats

### Manual Extractor Page
**Two-column split layout**:
- Left panel (50%): File upload zone at top (h-48 border-2 border-dashed), below shows extracted raw text in scrollable container (h-96 overflow-y-auto p-4 font-mono text-sm)
- Right panel (50%): Mapping form with labeled fields, each field group mb-6
- Sticky action bar at bottom: Save, Export, Clear buttons with gap-3

### AI Agent Extractor Page
**Single column with results table**:
- Top section: Upload zone + confidence threshold slider + Auto-extract toggle (flex items-center justify-between mb-6)
- Results table: Full-width with fixed header, columns for Name (25%), Email (20%), Phone (15%), Confidence (10%), Actions (15%), Flag (15%)
- Row height: h-14 for comfortable scanning
- Pagination below table

### Candidate Detail Modal
- Overlay: backdrop blur effect
- Modal: max-w-4xl, max-h-[90vh] overflow-y-auto
- Header: Candidate name + confidence badge + close button (flex justify-between items-center pb-4 border-b)
- Content sections: Education, Experience, Skills each in own panel with mb-8
- Each field: label above, editable input below, mb-4
- Footer actions: sticky bottom with Flag for Deep Extraction (primary), Save Changes, Cancel (gap-3)

---

## Component Library

### File Upload Zone
- Border: border-2 border-dashed rounded-lg
- Padding: p-12 text-center
- Content: Upload icon (h-12 w-12 mx-auto mb-4), heading, helper text
- Interactive: Clickable entire area, drag-over state indicated

### Data Table
- Header: sticky top-0, font-medium text-sm
- Rows: hover state, h-12 minimum
- Cells: px-4 py-3, truncate text with tooltip on hover
- Sortable columns: icon indicator
- Actions column: right-aligned icon buttons (Edit, Flag, Delete)

### Form Fields
- Labels: text-sm font-medium mb-2 block
- Inputs: w-full px-3 py-2 rounded border
- Multi-line (Experience, Summary): min-h-24
- Field groups: Space-y-4 within sections, mb-6 between sections

### Cards
- Standard: rounded-lg p-6 
- Stat cards: p-6 with large number (text-3xl font-bold) and label (text-sm)
- Candidate cards: p-4 with avatar/placeholder circle (h-10 w-10) on left, info on right

### Buttons
- Primary: px-6 py-2.5 rounded-md font-medium
- Secondary: px-4 py-2 rounded-md font-medium
- Icon buttons: h-8 w-8 rounded-md
- Button groups: flex gap-3

### Badges
- Confidence score: px-2.5 py-1 rounded-full text-xs font-medium
- Status: px-3 py-1 rounded text-xs

### Navigation
- Top nav bar: h-16 border-b, flex items-center justify-between px-6
- Tab navigation: flex gap-6, active tab with bottom border (border-b-2)

---

## Key Interactions

**File Processing**:
- Upload triggers immediate visual feedback (progress bar)
- Processing jobs show status: Queued → Processing → Complete (with icons)
- Bulk upload shows count: "Processing 12 of 24 files..."

**Inline Editing**:
- Click field to edit in place, no separate edit mode
- Save/Cancel buttons appear on field focus
- Auto-save indicators (subtle checkmark fade-in)

**Flagging Workflow**:
- Flag button: Prominent in actions column and detail view
- Flagged items: Visual indicator (colored dot or border accent) in table rows
- Deep extraction: Modal confirms action, shows progress

**Confidence Scores**:
- Display as percentage with badge
- Threshold slider: min-w-48, shows current value as you drag
- Low-confidence fields: Visual indicator to draw attention

---

## Responsive Behavior

**Desktop (lg+)**: Full multi-column layouts as described
**Tablet (md)**: Maintain two-column where possible, stack complex forms
**Mobile (base)**: Single column throughout, sticky headers on tables with horizontal scroll, bottom sheet for modals instead of centered overlays

---

## Animation Guidelines

**Minimal and purposeful only**:
- Modal/drawer slide-in: duration-300
- Upload progress: smooth animated width transition
- Success confirmations: Subtle scale + fade (scale-105 fade-in)
- No scroll animations, parallax, or decorative motion

---

## Images

This application does not require hero images or decorative photography. Focus on:
- Icon library: Heroicons via CDN for all UI icons
- File type indicators: PDF, EML, DOC icons in upload lists
- Empty states: Simple icon + text, no illustrations
- User avatars: Placeholder circles with initials when no photo