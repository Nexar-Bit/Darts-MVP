'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TrendingUp, TrendingDown, Minus, Award, AlertCircle } from 'lucide-react';

interface ScoreCardProps {
  scorecard: any;
  previousScorecard?: any; // For comparison
  className?: string;
}

/**
 * Get color class based on score (1-10 scale)
 */
function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get background color class based on score
 */
function getScoreBgColor(score: number): string {
  if (score >= 8) return 'bg-green-50 border-green-200';
  if (score >= 6) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

/**
 * Get trend indicator
 */
function getTrend(current: number, previous?: number) {
  if (previous === undefined || previous === null) return null;
  const diff = current - previous;
  if (diff > 0.5) return 'up';
  if (diff < -0.5) return 'down';
  return 'same';
}

/**
 * Score Card Component
 * 
 * Displays scoring metrics with visual indicators and comparison with previous attempts.
 * 
 * @example
 * ```tsx
 * <ScoreCard
 *   scorecard={result.scorecard}
 *   previousScorecard={previousResult?.scorecard}
 * />
 * ```
 */
function ScoreCard({
  scorecard,
  previousScorecard,
  className = '',
}: ScoreCardProps) {
  if (!scorecard || !Array.isArray(scorecard.categories) || scorecard.categories.length === 0) {
    return null;
  }

  const overallScore = scorecard.overall_score_1_to_10;
  const previousOverallScore = previousScorecard?.overall_score_1_to_10;
  const overallTrend = overallScore !== undefined && previousOverallScore !== undefined
    ? getTrend(overallScore, previousOverallScore)
    : null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Performance Scorecard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        {typeof overallScore === 'number' && (
          <div className={`border-2 rounded-lg p-6 ${getScoreBgColor(overallScore)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Overall Score</div>
                <div className="flex items-baseline gap-3">
                  <span className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                    {overallScore.toFixed(1)}
                  </span>
                  <span className="text-xl text-gray-500">/ 10</span>
                  {overallTrend && (
                    <div className="flex items-center gap-1">
                      {overallTrend === 'up' && (
                        <>
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-green-600 font-medium">
                            +{(overallScore - (previousOverallScore || 0)).toFixed(1)}
                          </span>
                        </>
                      )}
                      {overallTrend === 'down' && (
                        <>
                          <TrendingDown className="h-5 w-5 text-red-600" />
                          <span className="text-sm text-red-600 font-medium">
                            {(overallScore - (previousOverallScore || 0)).toFixed(1)}
                          </span>
                        </>
                      )}
                      {overallTrend === 'same' && (
                        <>
                          <Minus className="h-5 w-5 text-gray-500" />
                          <span className="text-sm text-gray-500">No change</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                {overallScore >= 8 ? (
                  <Award className="h-12 w-12 text-green-600" />
                ) : overallScore >= 6 ? (
                  <AlertCircle className="h-12 w-12 text-yellow-600" />
                ) : (
                  <AlertCircle className="h-12 w-12 text-red-600" />
                )}
              </div>
            </div>

            {/* Visual Score Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    overallScore >= 8
                      ? 'bg-green-500'
                      : overallScore >= 6
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${(overallScore / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Category Breakdown</h3>
          {scorecard.categories.map((category: any, index: number) => {
            const categoryScore = category?.score_1_to_10;
            const previousCategoryScore = previousScorecard?.categories?.[index]?.score_1_to_10;
            const trend = categoryScore !== undefined && previousCategoryScore !== undefined
              ? getTrend(categoryScore, previousCategoryScore)
              : null;

            return (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  typeof categoryScore === 'number'
                    ? getScoreBgColor(categoryScore)
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {category?.name || `Category ${index + 1}`}
                      </h4>
                      {trend && (
                        <div className="flex items-center gap-1">
                          {trend === 'up' && (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          )}
                          {trend === 'down' && (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          {trend === 'same' && (
                            <Minus className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Score Display */}
                    {typeof categoryScore === 'number' ? (
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className={`text-2xl font-bold ${getScoreColor(categoryScore)}`}>
                          {categoryScore.toFixed(1)}
                        </span>
                        <span className="text-gray-500">/ 10</span>
                        {trend && previousCategoryScore !== undefined && (
                          <span
                            className={`text-sm font-medium ${
                              trend === 'up'
                                ? 'text-green-600'
                                : trend === 'down'
                                ? 'text-red-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {trend === 'up' && '+'}
                            {(categoryScore - previousCategoryScore).toFixed(1)} from last
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm mb-3">No score available</div>
                    )}

                    {/* Score Bar */}
                    {typeof categoryScore === 'number' && (
                      <div className="mb-3">
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              categoryScore >= 8
                                ? 'bg-green-500'
                                : categoryScore >= 6
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${(categoryScore / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* What It Means */}
                    {category?.what_it_means && (
                      <p className="text-sm text-gray-700 leading-relaxed mb-2">
                        {category.what_it_means}
                      </p>
                    )}

                    {/* Quick Win */}
                    {category?.quick_win && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-700">
                          <strong className="text-green-700">Quick win:</strong>{' '}
                          <span className="text-green-700">{category.quick_win}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Note */}
        {previousScorecard && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Scores are compared with your previous analysis. 
              Trends show improvement (↑), decline (↓), or no change (−).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(ScoreCard);
