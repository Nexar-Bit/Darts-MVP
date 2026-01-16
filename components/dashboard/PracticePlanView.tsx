'use client';

import { memo } from 'react';
import ScorecardView from './ScorecardView';
import LessonDrillsView from './LessonDrillsView';

interface PracticePlanViewProps {
  plan: any;
  lesson: any;
}

function PracticePlanView({ plan, lesson }: PracticePlanViewProps) {
  if (!plan && !lesson) return null;

  const drills = plan?.practice_plan || [];
  const focusLegacy = plan?.next_upload_focus || [];

  const overview = lesson?.session_overview?.coach_summary || plan?.overview_of_throw || '';
  const primaryFocus = lesson?.session_overview?.one_thing_focus || plan?.primary_focus || '-';
  const sessionMinutes = lesson?.lesson_plan?.total_minutes ?? plan?.session_length_minutes ?? '-';
  const confidence = lesson?.session_overview?.confidence_note || plan?.confidence_note || '';

  const nextUploadList = lesson?.next_upload_checklist?.recording_setup || focusLegacy || [];

  return (
    <div>
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="border border-gray-200 rounded-lg p-4 bg-white min-w-[200px]">
          <div className="text-xs text-gray-500">Session length</div>
          <div className="text-lg font-bold text-gray-900 mt-1">
            {sessionMinutes} {typeof sessionMinutes === 'number' ? 'min' : ''}
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 bg-white min-w-[200px]">
          <div className="text-xs text-gray-500">Primary focus</div>
          <div className="text-lg font-bold text-gray-900 mt-1">{primaryFocus}</div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
        <div className="text-sm text-gray-700 leading-relaxed">{overview}</div>
      </div>

      <ScorecardView scorecard={lesson?.scorecard} />
      <LessonDrillsView lesson={lesson} />

      {!lesson?.lesson_plan?.blocks?.length ? (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Practice plan (drills)</h3>
          <div className="grid gap-3">
            {drills.map((d: any, idx: number) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-900">{d.drill}</div>
                  <div className="text-gray-700 opacity-85">{d.duration_minutes} min</div>
                </div>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-700">
                  {(d.steps || []).map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                {d.success_check ? (
                  <div className="text-sm text-gray-700 mt-2 leading-relaxed">
                    <strong>Success check:</strong> {d.success_check}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Next upload</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          {(nextUploadList || []).map((f: string, i: number) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
        {lesson?.next_upload_checklist?.how_many_throws ? (
          <div className="text-sm text-gray-700 mt-2 leading-relaxed">
            <strong>How many throws:</strong> {lesson.next_upload_checklist.how_many_throws}
          </div>
        ) : null}
      </div>

      {confidence ? (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Confidence note</h3>
          <div className="text-sm text-gray-700 leading-relaxed">{confidence}</div>
        </div>
      ) : null}
    </div>
  );
}

export default memo(PracticePlanView);
