'use client';

interface ScorecardViewProps {
  scorecard: any;
}

export default function ScorecardView({ scorecard }: ScorecardViewProps) {
  if (!scorecard || !Array.isArray(scorecard.categories) || scorecard.categories.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Scorecard</h3>

      <div className="flex gap-4 mb-4">
        <div className="border border-gray-200 rounded-lg p-4 bg-white min-w-[200px]">
          <div className="text-xs text-gray-500">Overall score</div>
          <div className="text-xl font-bold text-gray-900 mt-1">
            {typeof scorecard.overall_score_1_to_10 === 'number' 
              ? `${scorecard.overall_score_1_to_10}/10` 
              : '-'}
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {scorecard.categories.map((c: any, i: number) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-gray-900">{c?.name || 'Category'}</div>
              <div className="text-gray-700 opacity-90">
                {typeof c?.score_1_to_10 === 'number' ? `${c.score_1_to_10}/10` : '-'}
              </div>
            </div>

            {c?.what_it_means ? (
              <div className="text-sm text-gray-700 mt-2 leading-relaxed">
                {c.what_it_means}
              </div>
            ) : null}

            {c?.quick_win ? (
              <div className="text-sm text-gray-700 mt-2 leading-relaxed">
                <strong>Quick win:</strong> {c.quick_win}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
