'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CheckCircle, FileText, TrendingUp, Clock, Download, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export interface AnalysisResult {
  id: string;
  timestamp: string;
  status: 'processing' | 'completed' | 'failed';
  insights?: string[];
  recommendations?: string[];
  metrics?: {
    releaseAngle?: number;
    followThroughScore?: number;
    stanceScore?: number;
    overallScore?: number;
    [key: string]: any;
  };
  videoUrl?: string;
  reportUrl?: string;
}

interface AnalysisResultsProps {
  result: AnalysisResult;
  onNewAnalysis?: () => void;
}

export default function AnalysisResults({ result, onNewAnalysis }: AnalysisResultsProps) {
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (result.status === 'processing') {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Analysis in Progress</CardTitle>
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
          <CardDescription>
            Your video is being analyzed. This may take a few minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              <span>Started at {formatDate(result.timestamp)}</span>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              You&apos;ll be notified when the analysis is complete. You can check back later or refresh this page.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result.status === 'failed') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Analysis Failed</CardTitle>
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardDescription>
            There was an error processing your video.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-4">
            Please try uploading your video again. If the problem persists, contact support.
          </p>
          {onNewAnalysis && (
            <Button variant="primary" onClick={onNewAnalysis}>
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Analysis Results</CardTitle>
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <CardDescription>
          Analysis completed at {formatDate(result.timestamp)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics Overview */}
        {result.metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border border-green-200">
            {result.metrics.overallScore !== undefined && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {result.metrics.overallScore.toFixed(1)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Overall Score</div>
              </div>
            )}
            {result.metrics.releaseAngle !== undefined && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {result.metrics.releaseAngle}°
                </div>
                <div className="text-xs text-gray-600 mt-1">Release Angle</div>
              </div>
            )}
            {result.metrics.followThroughScore !== undefined && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {result.metrics.followThroughScore.toFixed(1)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Follow-Through</div>
              </div>
            )}
            {result.metrics.stanceScore !== undefined && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {result.metrics.stanceScore.toFixed(1)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Stance</div>
              </div>
            )}
          </div>
        )}

        {/* Key Insights */}
        {result.insights && result.insights.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              Key Insights
            </h4>
            <ul className="space-y-2">
              {result.insights.map((insight, index) => (
                <li key={index} className="flex items-start text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations && result.recommendations.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="h-5 w-5 text-blue-600 mr-2" />
              Recommendations
            </h4>
            <ul className="space-y-2">
              {result.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start text-sm text-gray-700">
                  <FileText className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-green-200 flex flex-wrap gap-3">
          {result.reportUrl && (
            <a href={result.reportUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </a>
          )}
          <Link href="/dashboard/analyze">
            <Button variant="outline" size="sm">
              View Full Analysis
            </Button>
          </Link>
          {onNewAnalysis && (
            <Button variant="primary" size="sm" onClick={onNewAnalysis}>
              Analyze Another Throw
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
