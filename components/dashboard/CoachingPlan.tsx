'use client';

import { memo, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ChevronDown, ChevronUp, BookOpen, Target, Clock } from 'lucide-react';

interface CoachingPlanProps {
  lessonPlan?: any;
  practicePlan?: any;
  className?: string;
}

interface ExpandableSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const ExpandableSection = memo(function ExpandableSection({
  title,
  icon,
  defaultExpanded = false,
  children,
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const toggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {icon && <div className="text-gray-600">{icon}</div>}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 bg-white border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
});

/**
 * Coaching Plan Component
 * 
 * Displays lesson_plan and practice_plan with expandable/collapsible sections.
 * 
 * @example
 * ```tsx
 * <CoachingPlan
 *   lessonPlan={result.lesson_plan}
 *   practicePlan={result.practice_plan}
 * />
 * ```
 */
function CoachingPlan({
  lessonPlan,
  practicePlan,
  className = '',
}: CoachingPlanProps) {
  if (!lessonPlan && !practicePlan) {
    return null;
  }

  const overview = lessonPlan?.session_overview?.coach_summary || practicePlan?.overview_of_throw || '';
  const primaryFocus = lessonPlan?.session_overview?.one_thing_focus || practicePlan?.primary_focus || '';
  const sessionMinutes = lessonPlan?.lesson_plan?.total_minutes ?? practicePlan?.session_length_minutes ?? null;
  const confidence = lessonPlan?.session_overview?.confidence_note || practicePlan?.confidence_note || '';
  const nextUploadList = lessonPlan?.next_upload_checklist?.recording_setup || practicePlan?.next_upload_focus || [];
  const blocks = lessonPlan?.lesson_plan?.blocks || [];
  const drills = practicePlan?.practice_plan || [];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Coaching Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Overview */}
        {(sessionMinutes || primaryFocus) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessionMinutes && (
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div className="text-xs text-gray-500">Session length</div>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {sessionMinutes} {typeof sessionMinutes === 'number' ? 'min' : ''}
                </div>
              </div>
            )}
            {primaryFocus && (
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-gray-500" />
                  <div className="text-xs text-gray-500">Primary focus</div>
                </div>
                <div className="text-lg font-bold text-gray-900">{primaryFocus}</div>
              </div>
            )}
          </div>
        )}

        {/* Overview Section */}
        {overview && (
          <ExpandableSection
            title="Overview"
            icon={<BookOpen className="h-5 w-5" />}
            defaultExpanded={true}
          >
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {overview}
            </p>
          </ExpandableSection>
        )}

        {/* Lesson Plan Blocks */}
        {blocks.length > 0 && (
          <ExpandableSection
            title="Drill-based Session"
            icon={<Target className="h-5 w-5" />}
            defaultExpanded={true}
          >
            {lessonPlan?.lesson_plan?.structure_note && (
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                {lessonPlan.lesson_plan.structure_note}
              </p>
            )}
            <div className="space-y-4">
              {blocks.map((block: any, blockIndex: number) => (
                <div key={blockIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{block?.block_name || 'Block'}</h4>
                    {typeof block?.minutes === 'number' && (
                      <span className="text-sm text-gray-600">{block.minutes} min</span>
                    )}
                  </div>

                  {block?.goal && (
                    <p className="text-sm text-gray-700 mb-3">
                      <strong>Goal:</strong> {block.goal}
                    </p>
                  )}

                  {Array.isArray(block?.drills) && block.drills.length > 0 && (
                    <div className="space-y-3 mt-3">
                      {block.drills.map((drill: any, drillIndex: number) => (
                        <div key={drillIndex} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-gray-900">{drill?.drill_name || 'Drill'}</h5>
                            {typeof drill?.minutes === 'number' && (
                              <span className="text-xs text-gray-600">{drill.minutes} min</span>
                            )}
                          </div>

                          {drill?.purpose && (
                            <p className="text-sm text-gray-700 mb-2">{drill.purpose}</p>
                          )}

                          {Array.isArray(drill?.steps) && drill.steps.length > 0 && (
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mt-2">
                              {drill.steps.map((step: string, stepIndex: number) => (
                                <li key={stepIndex}>{step}</li>
                              ))}
                            </ul>
                          )}

                          {drill?.success_criteria && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm text-gray-700">
                                <strong>Success check:</strong> {drill.success_criteria}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Practice Plan Drills (if no lesson plan blocks) */}
        {blocks.length === 0 && drills.length > 0 && (
          <ExpandableSection
            title="Practice Plan (Drills)"
            icon={<Target className="h-5 w-5" />}
            defaultExpanded={true}
          >
            <div className="space-y-3">
              {drills.map((drill: any, idx: number) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{drill.drill}</h4>
                    {drill.duration_minutes && (
                      <span className="text-sm text-gray-600">{drill.duration_minutes} min</span>
                    )}
                  </div>
                  {Array.isArray(drill.steps) && drill.steps.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mt-2">
                      {drill.steps.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  )}
                  {drill.success_check && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-700">
                        <strong>Success check:</strong> {drill.success_check}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Next Upload Checklist */}
        {nextUploadList.length > 0 && (
          <ExpandableSection
            title="Next Upload Checklist"
            icon={<BookOpen className="h-5 w-5" />}
            defaultExpanded={false}
          >
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
              {nextUploadList.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            {lessonPlan?.next_upload_checklist?.how_many_throws && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-700">
                  <strong>How many throws:</strong> {lessonPlan.next_upload_checklist.how_many_throws}
                </p>
              </div>
            )}
          </ExpandableSection>
        )}

        {/* Confidence Note */}
        {confidence && (
          <ExpandableSection
            title="Confidence Note"
            icon={<BookOpen className="h-5 w-5" />}
            defaultExpanded={false}
          >
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {confidence}
            </p>
          </ExpandableSection>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(CoachingPlan);
