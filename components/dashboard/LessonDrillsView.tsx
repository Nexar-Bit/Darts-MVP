'use client';

interface LessonDrillsViewProps {
  lesson: any;
}

export default function LessonDrillsView({ lesson }: LessonDrillsViewProps) {
  const blocks = lesson?.lesson_plan?.blocks;
  if (!lesson || !lesson.lesson_plan || !Array.isArray(blocks) || blocks.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Drill-based session</h3>

      {lesson?.lesson_plan?.structure_note ? (
        <div className="text-sm text-gray-700 mb-4 leading-relaxed">{lesson.lesson_plan.structure_note}</div>
      ) : null}

      <div className="grid gap-3">
        {blocks.map((b: any, bi: number) => (
          <div key={bi} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-gray-900">{b?.block_name || 'Block'}</div>
              <div className="text-gray-700 opacity-85">
                {typeof b?.minutes === 'number' ? `${b.minutes} min` : ''}
              </div>
            </div>

            {b?.goal ? (
              <div className="text-sm text-gray-700 mt-2 leading-relaxed">
                <strong>Goal:</strong> {b.goal}
              </div>
            ) : null}

            {Array.isArray(b?.drills) ? (
              <div className="grid gap-3 mt-3">
                {b.drills.map((d: any, di: number) => (
                  <div key={di} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-gray-900">{d?.drill_name || 'Drill'}</div>
                      <div className="text-gray-700 opacity-85">
                        {typeof d?.minutes === 'number' ? `${d.minutes} min` : ''}
                      </div>
                    </div>

                    {d?.purpose ? (
                      <div className="text-sm text-gray-700 mt-2 leading-relaxed">{d.purpose}</div>
                    ) : null}

                    {Array.isArray(d?.steps) ? (
                      <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-700">
                        {d.steps.map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    ) : null}

                    {d?.success_criteria ? (
                      <div className="text-sm text-gray-700 mt-2 leading-relaxed">
                        <strong>Success check:</strong> {d.success_criteria}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
