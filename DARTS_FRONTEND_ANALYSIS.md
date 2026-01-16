# Darts Frontend Analysis

## 1. Application Structure Overview

### Tech Stack
- **Framework**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 7.2.4
- **Styling**: Custom CSS (no CSS framework)
- **State Management**: React hooks (useState, useEffect, useMemo, useRef)

### Entry Point
- `main.tsx` → Renders `App.tsx` component
- `App.tsx` is the main application component (~1200 lines)

---

## 2. API Endpoints & Request/Response Formats

### Base Configuration
```typescript
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const DEV_USER_ID = "dev_user";
```

### Endpoints Identified

#### 1. **POST `/analyze`** - Upload & Start Analysis
**Request:**
- Method: `POST`
- Query Params: `?model=gpt-5-mini`
- Body: `FormData`
  - `side_video`: File (optional)
  - `front_video`: File (optional)
  - `user_id`: string

**Response:**
```typescript
{
  job_id: string
}
```

**Validation:**
- Max file size: 400MB per video
- Max duration: 70 seconds per video
- At least one video required (side or front)

---

#### 2. **GET `/users/{user_id}/jobs`** - List User Jobs
**Request:**
- Method: `GET`
- Query Params: `?limit=100`

**Response:**
```typescript
{
  user_id: string;
  count: number;
  jobs: JobListItem[];
}

type JobListItem = {
  job_id: string;
  user_id: string;
  created_at_unix: number;
  original_filename?: string | null;
  status: "queued" | "running" | "done" | "failed";
  progress?: number | null;  // 0-1
  stage?: string | null;
  error_message?: string | null;
  overlay_url?: string | null;
  analysis_url?: string | null;
  practice_plan_url?: string | null;
  practice_plan_txt_url?: string | null;
  lesson_plan_url?: string | null;
  throws_detected?: number | null;
}
```

---

#### 3. **GET `/jobs/{job_id}`** - Get Job Status
**Request:**
- Method: `GET`

**Response:**
```typescript
{
  job_id: string;
  status: "queued" | "running" | "done" | "failed" | "not_found";
  progress?: number;  // 0-1
  stage?: string;
  error?: any;
  result?: {
    overlay_url?: string;
    overlay_side_url?: string;
    overlay_front_url?: string;
    practice_plan_pdf_url?: string;
    practice_plan?: PracticePlan;
    lesson_plan?: LessonPlan;
    // ... other result fields
  };
}
```

**Polling Behavior:**
- Polls every 1 second while status is "queued" or "running"
- Stops polling when status is "done", "failed", or "not_found"
- On error, retries after 1.5 seconds

---

#### 4. **GET `/health`** - API Health Check
**Request:**
- Method: `GET`
- Opens in new tab for debugging

---

## 3. State Machine: Upload → Analyze → Polling → Results → History

### State Flow Diagram

```
[Initial State: List View]
    ↓
[User selects video(s)]
    ↓
[Upload Form Submitted]
    ↓
[POST /analyze]
    ↓
[Job Created → job_id returned]
    ↓
[Switch to Detail View]
    ↓
[Start Polling GET /jobs/{job_id}]
    ↓
    ├─→ [Status: "queued"] → Continue polling (1s interval)
    ├─→ [Status: "running"] → Show progress, continue polling (1s interval)
    ├─→ [Status: "done"] → Stop polling, display results
    └─→ [Status: "failed"] → Stop polling, show error
```

### Key State Variables

```typescript
// View state
const [view, setView] = useState<"list" | "detail">("list");
const [selectedJobId, setSelectedJobId] = useState<string>("");

// Upload state
const [sideFile, setSideFile] = useState<File | null>(null);
const [frontFile, setFrontFile] = useState<File | null>(null);
const [uploadBusy, setUploadBusy] = useState(false);
const [uploadErr, setUploadErr] = useState("");
const [uploadMsg, setUploadMsg] = useState("");

// Jobs list state
const [jobs, setJobs] = useState<JobListItem[]>([]);
const [listLoading, setListLoading] = useState(false);
const [listErr, setListErr] = useState("");

// Detail/analysis state
const [detail, setDetail] = useState<JobStatusResponse | null>(null);
const [detailErr, setDetailErr] = useState("");
const [polling, setPolling] = useState(false);
```

### URL State Management
- Uses URL search params: `?job={job_id}` to track current job
- Browser back/forward navigation supported
- `getViewFromUrl()` and `setJobInUrl()` handle URL sync

---

## 4. UI Components Breakdown

### 4.1 Core Layout Components

#### **ProfileMenu**
- **Location**: Top-right header
- **Features**:
  - Avatar with user initials
  - Dropdown menu
  - "Open API health" link
  - Sign out button (dev mode placeholder)
- **Props**: `userId`, `onOpenHealth`

#### **EmptyState**
- **Usage**: Shown when no jobs exist
- **Features**:
  - Decorative orbs illustration
  - Title and subtitle
  - Optional action button
- **Props**: `title`, `subtitle`, `action?`

---

### 4.2 Upload Components

#### **UploadCard**
- **Purpose**: File picker for side-on or front-on videos
- **Features**:
  - Drag & drop support
  - Click to select
  - File validation feedback
  - File chip display with remove button
  - Status badge (Ready/Optional)
- **Props**: `label`, `hint`, `file`, `setFile`, `busy`, `validate`
- **Validation**: Checks file size and duration before accepting

#### **Upload Form**
- **Location**: Main card on list view
- **Features**:
  - Two `UploadCard` components (side + front)
  - Submit button ("Analyse video(s)")
  - Upload progress messaging
  - Error display

---

### 4.3 Job List Components

#### **RecentResults**
- **Purpose**: Sidebar showing last 5 jobs
- **Features**:
  - Clickable job rows
  - Status badges
  - Throws count display
  - Empty state when no jobs

#### **Jobs Table/Cards**
- **Responsive**: Table on desktop, cards on mobile
- **Columns/Fields**:
  - Date (formatted)
  - Filename
  - Status badge + progress %
  - Throws detected
  - "View" button
- **Features**:
  - Refresh button
  - Loading state
  - Error display
  - Empty state

---

### 4.4 Analysis Detail Components

#### **StatusBadge**
- **Purpose**: Visual status indicator
- **Statuses**: `queued`, `running`, `done`, `failed`, `not_found`
- **Styling**: Color-coded badges (purple, yellow, green, red)

#### **Progress Indicator**
- **Purpose**: Show analysis progress
- **Features**:
  - Animated progress bar (0-100%)
  - Shimmer animation while working
  - Status text ("Queued…" or "Working… X%")

#### **OverlayPanel**
- **Purpose**: Video player for overlay videos
- **Features**:
  - Side view / Front view tabs (if both available)
  - Video controls (play/pause, seek ±2s, ±0.5s)
  - Sticky positioning on desktop
  - Fallback message if no overlay available
- **Props**: `overlayUrl`, `overlaySideUrl?`, `overlayFrontUrl?`

#### **PracticePlanView**
- **Purpose**: Display coaching plan and analysis results
- **Sections**:
  1. **KPIs**: Session length, Primary focus
  2. **Overview**: Coach summary text
  3. **Scorecard**: Overall score + category breakdowns
  4. **Lesson Drills**: Drill-based session with blocks
  5. **Practice Plan**: Legacy drill list (if no lesson plan)
  6. **Next Upload**: Checklist for next recording
  7. **Confidence Note**: Optional confidence feedback
- **Props**: `plan`, `lesson`

#### **ScorecardView**
- **Purpose**: Display analysis scorecard
- **Features**:
  - Overall score (1-10)
  - Category breakdowns with:
    - Category name
    - Score (1-10)
    - "What it means" explanation
    - "Quick win" tips
- **Props**: `scorecard`

#### **LessonDrillsView**
- **Purpose**: Display drill-based lesson plan
- **Structure**:
  - Blocks (with time allocation)
    - Goals
    - Drills (with time)
      - Purpose
      - Steps (bulleted list)
      - Success criteria
- **Props**: `lesson`

---

### 4.5 Utility Components

#### **File Validation**
- `validateUploadFile(file: File)`: Checks size and duration
- `getVideoDurationSeconds(file: File)`: Reads video metadata

#### **URL Helpers**
- `absUrl(maybeRelative: string)`: Converts relative URLs to absolute
- `getViewFromUrl()`: Parses URL for view state
- `setJobInUrl(jobId: string | null)`: Updates URL with job ID

#### **Formatting Helpers**
- `fmtDate(unixSeconds: number)`: Formats Unix timestamp
- `humanFileSize(bytes: number)`: Formats file sizes (B, KB, MB, GB)
- `initialsFromId(userId: string)`: Generates avatar initials

---

## 5. CSS Structure & Design System

### 5.1 Color Palette

```css
--bg: #f6f7fb                    /* Background */
--card: #ffffff                  /* Card background */
--border: #e7e7f2                /* Borders */
--text: #0f1222                  /* Primary text */
--muted: rgba(15, 18, 34, 0.68)  /* Muted text */

--purple: #6d28d9               /* Primary purple */
--purple-2: #7c3aed             /* Lighter purple */
--purple-3: #4c1d95             /* Darker purple */
```

### 5.2 Layout System

#### **Page Structure**
```css
.page                    /* Outer container with padding */
  └─ .shellWrap          /* Centered wrapper */
      └─ .appShell       /* Max-width 1100px container */
          ├─ .hero       /* Header with logo */
          └─ .container  /* Main content grid */
```

#### **Grid Systems**
- **Detail View**: `.detailGrid` - 2 columns (1fr 460px) on desktop, 1 column on mobile
- **Video Controls**: `.videoControls` - 5-column grid (responsive to 2 columns)

### 5.3 Component Classes

#### **Cards**
- `.card` - Base card style (white background, border, shadow, rounded)
- `.cardHero` - Hero card with purple gradient background
- `.subcard` - Nested card (lighter background)
- `.drillCard` - Drill-specific card styling

#### **Buttons**
- `.buttonPrimary` - Purple gradient, white text, shadow
- `.buttonSecondary` - White background, border, hover effects
- `.buttonPrimaryLink` - Link styled as primary button

#### **Badges**
- `.badge` - Base badge style
- `.badgeQueued` - Purple tint
- `.badgeRunning` - Yellow/amber tint
- `.badgeDone` - Green tint
- `.badgeFailed` - Red tint

#### **Upload Components**
- `.dropzone` - Dashed border, purple tint background
- `.dropzoneStrong` - Active drag-over state
- `.fileChip` - Selected file display chip

#### **Progress**
- `.progressWrap` - Progress bar container
- `.progressBar` - Animated progress fill
- `.progressAnim` - Shimmer animation overlay

#### **Typography**
- `h2`, `h3` - Section headings
- `.bodyText` - Body text with opacity
- `.mutedSmall` - Small muted text
- `code` - Inline code with purple background

### 5.4 Responsive Breakpoints

```css
@media (max-width: 980px) {
  /* Detail grid becomes single column */
  /* Video controls become 2 columns */
}

@media (max-width: 760px) {
  /* Hero becomes vertical layout */
  /* Jobs table becomes cards */
  /* Logo size reduced */
}

@media (max-width: 420px) {
  /* Logo further reduced */
}
```

### 5.5 Special Effects

#### **Background Gradients**
- Radial gradients on `:root` for subtle purple ambiance
- Hero card has layered radial gradients
- Progress bar uses linear gradient

#### **Shadows**
- `--shadow`: Large shadow (12px 30px)
- `--shadow-2`: Smaller shadow (6px 16px)
- Used on cards, buttons, and profile menu

#### **Animations**
- `@keyframes shimmer`: Progress bar shimmer effect
- Smooth transitions on hover states

### 5.6 Empty States
- `.emptyState` - Centered empty state container
- `.emptyArt` - Decorative orbs illustration
- `.orb1`, `.orb2`, `.orb3` - Three overlapping circular elements

---

## 6. Key Features & Behaviors

### 6.1 File Upload Flow
1. User drags/drops or selects video(s)
2. Client-side validation (size, duration)
3. Form submission creates FormData
4. POST to `/analyze` with `side_video` and/or `front_video`
5. Job ID returned, user redirected to detail view
6. Polling starts automatically

### 6.2 Polling Mechanism
- **Interval**: 1 second for active jobs
- **Retry**: 1.5 seconds on error
- **Stop Conditions**: `done`, `failed`, `not_found`
- **Side Effects**: Refreshes job list when complete

### 6.3 URL State Management
- Uses browser History API
- Syncs view state with URL params
- Supports browser back/forward navigation
- Format: `?job={job_id}`

### 6.4 Video Handling
- Supports side-on and/or front-on videos
- Separate upload cards for each type
- Overlay videos can have separate side/front URLs
- Tab switching in overlay panel if both views available

### 6.5 Results Display
- **Practice Plan**: Overview, scorecard, drills, next upload checklist
- **Overlay Video**: Annotated video with playback controls
- **PDF Download**: Link to practice plan PDF
- **Recent Results**: Quick access to last 5 analyses

---

## 7. Integration Points for Next.js Migration

### 7.1 API Routes to Create
- `POST /api/analyze` - Handle video upload and job creation
- `GET /api/jobs` - List user's jobs
- `GET /api/jobs/[jobId]` - Get job status
- `GET /api/health` - Health check endpoint

### 7.2 Authentication Integration
- Replace `DEV_USER_ID` with Supabase user ID
- Add authentication checks to API routes
- Integrate with existing `ProtectedRoute` component

### 7.3 File Upload Handling
- Use Next.js API routes with `FormData` parsing
- Integrate with existing `/api/analyze` route structure
- Handle file storage (Supabase Storage or similar)

### 7.4 State Management
- Convert to Next.js App Router structure
- Use Server Components where possible
- Client Components for interactive features (upload, polling)

### 7.5 Styling Migration
- Convert CSS to Tailwind CSS (already in project)
- Map existing classes to Tailwind utilities
- Preserve design system (colors, spacing, shadows)

---

## 8. Component Mapping to Next.js Structure

### Suggested File Structure
```
app/
  dashboard/
    analyze/
      page.tsx              # Main analysis page (list view)
      [jobId]/
        page.tsx            # Job detail page
    components/
      UploadCard.tsx        # Upload component
      OverlayPanel.tsx      # Video player
      PracticePlanView.tsx  # Results display
      ScorecardView.tsx     # Scorecard component
      LessonDrillsView.tsx  # Lesson plan display
      RecentResults.tsx     # Sidebar job list
      StatusBadge.tsx       # Status indicator
      EmptyState.tsx        # Empty state component
```

### API Routes
```
app/api/
  analyze/
    route.ts               # POST - Create analysis job
  jobs/
    route.ts               # GET - List jobs
    [jobId]/
      route.ts             # GET - Get job status
  health/
    route.ts               # GET - Health check
```

---

## 9. Data Flow Summary

```
User Action → Component State → API Call → Backend Processing
    ↓              ↓                ↓              ↓
UI Update ← State Update ← API Response ← Job Status Update
```

### Example: Upload Flow
1. User selects file → `setSideFile(file)`
2. User submits form → `startUpload()`
3. Validate files → `validateUploadFile()`
4. Create FormData → `new FormData()`
5. POST `/analyze` → Backend creates job
6. Receive `job_id` → `openDetail(jobId)`
7. Start polling → `useEffect` with interval
8. Display results → `PracticePlanView` renders

---

## 10. Notes & Considerations

### Current Limitations
- Uses hardcoded `DEV_USER_ID` (needs auth integration)
- No error recovery for failed uploads
- No retry mechanism for failed API calls
- Polling continues even if user navigates away (should cleanup)

### Enhancements Needed
- Authentication integration (Supabase)
- File upload progress indicator
- Cancel analysis functionality
- Better error messages
- Loading skeletons
- Optimistic UI updates

### Performance Considerations
- Large video files (400MB limit)
- Polling every 1 second (could be optimized)
- Video playback performance
- Image/asset optimization

---

## End of Analysis

This document provides a complete overview of the darts-frontend React application structure, ready for migration to Next.js 14 App Router.
