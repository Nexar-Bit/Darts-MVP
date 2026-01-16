# Results Display Components Documentation

## Overview

Four specialized components for displaying analysis results:
1. **VideoPlayer** - Enhanced video playback
2. **CoachingPlan** - Structured coaching plan display
3. **ScoreCard** - Performance scoring with comparisons
4. **PdfDownload** - PDF download functionality

---

## 1. VideoPlayer Component

### Features
- Video playback with native controls
- Thumbnail preview (optional)
- Fullscreen support
- Download functionality
- Custom play/pause overlay
- Loading and error states

### Usage

```tsx
import VideoPlayer from '@/components/dashboard/VideoPlayer';

<VideoPlayer
  videoUrl="/videos/overlay.mp4"
  title="Overlay Video"
  description="Your throw with analysis overlays"
  thumbnailUrl="/thumbnails/overlay.jpg"
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `videoUrl` | `string` | Yes | URL of the video (relative or absolute) |
| `title` | `string` | No | Title displayed in header (default: "Video") |
| `description` | `string` | No | Description text |
| `thumbnailUrl` | `string` | No | Thumbnail image URL for preview |
| `className` | `string` | No | Additional CSS classes |

### Features
- ✅ Play/pause controls
- ✅ Fullscreen button
- ✅ Download button
- ✅ Thumbnail preview (click to play)
- ✅ Loading indicator
- ✅ Error handling

---

## 2. CoachingPlan Component

### Features
- Expandable/collapsible sections
- Lesson plan display (drill-based)
- Practice plan display
- Session overview
- Next upload checklist
- Confidence notes

### Usage

```tsx
import CoachingPlan from '@/components/dashboard/CoachingPlan';

<CoachingPlan
  lessonPlan={result.lesson_plan}
  practicePlan={result.practice_plan}
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `lessonPlan` | `any` | No | Lesson plan object from API |
| `practicePlan` | `any` | No | Practice plan object from API |
| `className` | `string` | No | Additional CSS classes |

### Sections

1. **Session Overview** (always expanded)
   - Session length
   - Primary focus

2. **Overview** (expandable, default: expanded)
   - Coach summary

3. **Drill-based Session** (expandable, default: expanded)
   - Blocks with drills
   - Goals and success criteria

4. **Practice Plan** (expandable, default: expanded)
   - List of drills
   - Steps and duration

5. **Next Upload Checklist** (expandable, default: collapsed)
   - Recording setup tips
   - How many throws

6. **Confidence Note** (expandable, default: collapsed)
   - Confidence feedback

---

## 3. ScoreCard Component

### Features
- Overall score display
- Category breakdown
- Visual score bars
- Trend indicators (↑↓−)
- Comparison with previous attempts
- Color-coded performance levels

### Usage

```tsx
import ScoreCard from '@/components/dashboard/ScoreCard';

<ScoreCard
  scorecard={result.scorecard}
  previousScorecard={previousResult?.scorecard}
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `scorecard` | `any` | Yes | Scorecard object with categories |
| `previousScorecard` | `any` | No | Previous scorecard for comparison |
| `className` | `string` | No | Additional CSS classes |

### Visual Indicators

- **Green** (8-10): Excellent performance
- **Yellow** (6-7.9): Good performance
- **Red** (<6): Needs improvement

### Trend Indicators

- **↑** (TrendingUp): Score improved
- **↓** (TrendingDown): Score declined
- **−** (Minus): No significant change

---

## 4. PdfDownload Component

### Features
- Download PDF functionality
- Progress indicator during download
- Open in new tab option
- Success/error feedback
- Automatic filename handling

### Usage

```tsx
import PdfDownload from '@/components/dashboard/PdfDownload';

<PdfDownload
  pdfUrl="/api/pdfs/practice-plan.pdf"
  filename="my-practice-plan.pdf"
  variant="primary"
  size="md"
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `pdfUrl` | `string` | Yes | URL of the PDF (relative or absolute) |
| `filename` | `string` | No | Download filename (default: "practice-plan.pdf") |
| `className` | `string` | No | Additional CSS classes |
| `variant` | `'primary' \| 'outline'` | No | Button variant (default: "primary") |
| `size` | `'sm' \| 'md' \| 'lg'` | No | Button size (default: "md") |

### Features
- ✅ Download button with progress
- ✅ Open in new tab button
- ✅ Success feedback (3s)
- ✅ Error handling with messages
- ✅ Loading state during download

---

## Complete Example: Results Display

```tsx
'use client';

import VideoPlayer from '@/components/dashboard/VideoPlayer';
import CoachingPlan from '@/components/dashboard/CoachingPlan';
import ScoreCard from '@/components/dashboard/ScoreCard';
import PdfDownload from '@/components/dashboard/PdfDownload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export function AnalysisResults({ result, previousResult }: { result: any; previousResult?: any }) {
  return (
    <div className="space-y-6">
      {/* Video Player */}
      <VideoPlayer
        videoUrl={result.overlay_url}
        overlaySideUrl={result.overlay_side_url}
        overlayFrontUrl={result.overlay_front_url}
        title="Analysis Video"
      />

      {/* Score Card */}
      <ScoreCard
        scorecard={result.scorecard}
        previousScorecard={previousResult?.scorecard}
      />

      {/* Coaching Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Practice Plan</CardTitle>
            <PdfDownload
              pdfUrl={result.practice_plan_pdf_url}
              filename="practice-plan.pdf"
            />
          </div>
        </CardHeader>
        <CardContent>
          <CoachingPlan
            lessonPlan={result.lesson_plan}
            practicePlan={result.practice_plan}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Integration with useAnalysis Hook

All components work seamlessly with the `useAnalysis` hook:

```tsx
import { useAnalysis } from '@/lib/hooks';
import VideoPlayer from '@/components/dashboard/VideoPlayer';
import ScoreCard from '@/components/dashboard/ScoreCard';
import CoachingPlan from '@/components/dashboard/CoachingPlan';
import PdfDownload from '@/components/dashboard/PdfDownload';

function ResultsView() {
  const { result, history } = useAnalysis();
  
  if (!result || !result.result) return null;

  const currentResult = result.result;
  const previousResult = history[1]?.result_data; // Get previous result

  return (
    <div className="space-y-6">
      <VideoPlayer
        videoUrl={currentResult.overlay_url}
        overlaySideUrl={currentResult.overlay_side_url}
        overlayFrontUrl={currentResult.overlay_front_url}
      />
      
      <ScoreCard
        scorecard={currentResult.scorecard}
        previousScorecard={previousResult?.scorecard}
      />
      
      <CoachingPlan
        lessonPlan={currentResult.lesson_plan}
        practicePlan={currentResult.practice_plan}
      />
      
      {currentResult.practice_plan_pdf_url && (
        <PdfDownload pdfUrl={currentResult.practice_plan_pdf_url} />
      )}
    </div>
  );
}
```

---

## Styling

All components use Tailwind CSS and match the existing design system:
- Consistent spacing and colors
- Responsive design
- Accessible (ARIA labels, keyboard navigation)
- Loading and error states

---

## Best Practices

1. **Always check for data**: Components handle missing data gracefully
2. **Use error boundaries**: Wrap result components in ErrorBoundary
3. **Provide previous data**: ScoreCard benefits from comparison data
4. **Handle loading states**: Components show loading indicators
5. **Accessibility**: All components are keyboard accessible
