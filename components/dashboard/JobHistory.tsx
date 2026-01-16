'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import { RefreshCw, Search, Eye, Trash2, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAnalysis } from '@/lib/hooks';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { JobHistorySkeleton } from '@/components/ui/LoadingSkeleton';
import ErrorDisplay from './ErrorDisplay';

interface JobHistoryProps {
  onJobClick?: (jobId: string) => void;
  showFilters?: boolean;
  showPagination?: boolean;
  itemsPerPage?: number;
  virtualize?: boolean;
  className?: string;
}

type StatusFilter = 'all' | 'done' | 'failed' | 'running' | 'queued';

function fmtDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString();
}

function formatRelativeTime(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  
  return fmtDate(unixSeconds);
}

function JobHistory({
  onJobClick,
  showFilters = true,
  showPagination = true,
  itemsPerPage = 10,
  virtualize = true,
  className = '',
}: JobHistoryProps) {
  const router = useRouter();
  const toast = useToast();
  const { history, refreshHistory } = useAnalysis();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [desktopScrollTop, setDesktopScrollTop] = useState(0);
  const [mobileScrollTop, setMobileScrollTop] = useState(0);
  const [desktopHeight, setDesktopHeight] = useState(480);
  const [mobileHeight, setMobileHeight] = useState(520);

  const desktopListRef = useRef<HTMLDivElement | null>(null);
  const mobileListRef = useRef<HTMLDivElement | null>(null);

  const DESKTOP_ROW_HEIGHT = 72;
  const MOBILE_ROW_HEIGHT = 150;
  const OVERSCAN = 6;

  const filteredJobs = useMemo(() => {
    let filtered = [...history];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job =>
        job.original_filename?.toLowerCase().includes(query) ||
        job.job_id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [history, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredJobs.slice(start, end);
  }, [filteredJobs, currentPage, itemsPerPage]);

  const listSource = showPagination ? paginatedJobs : filteredJobs;

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    if (!virtualize || !desktopListRef.current) return;
    const el = desktopListRef.current;
    setDesktopHeight(el.clientHeight);
    const observer = new ResizeObserver(() => setDesktopHeight(el.clientHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [virtualize]);

  useEffect(() => {
    if (!virtualize || !mobileListRef.current) return;
    const el = mobileListRef.current;
    setMobileHeight(el.clientHeight);
    const observer = new ResizeObserver(() => setMobileHeight(el.clientHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [virtualize]);

  const handleJobClick = useCallback((jobId: string) => {
    if (onJobClick) {
      onJobClick(jobId);
    } else {
      router.push(`/dashboard/analyze/${jobId}`);
    }
  }, [onJobClick, router]);

  const handleDelete = useCallback(async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this analysis? This action cannot be undone.')) {
      return;
    }

    setDeletingJobId(jobId);

    try {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('job_id', jobId);

      if (error) {
        throw error;
      }

      toast.success('Analysis deleted successfully');
      refreshHistory();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.message || 'Failed to delete analysis');
    } finally {
      setDeletingJobId(null);
    }
  }, [refreshHistory, toast]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleStatusChange = useCallback((status: StatusFilter) => {
    setStatusFilter(status);
  }, []);

  const statusCounts = useMemo(() => {
    return {
      all: history.length,
      done: history.filter(j => j.status === 'done').length,
      failed: history.filter(j => j.status === 'failed').length,
      running: history.filter(j => j.status === 'running').length,
      queued: history.filter(j => j.status === 'queued').length,
    };
  }, [history]);

  const desktopVirtual = useMemo(() => {
    if (!virtualize) {
      return {
        items: listSource,
        totalHeight: 0,
        startIndex: 0,
      };
    }

    const totalHeight = listSource.length * DESKTOP_ROW_HEIGHT;
    const startIndex = Math.max(0, Math.floor(desktopScrollTop / DESKTOP_ROW_HEIGHT) - OVERSCAN);
    const endIndex = Math.min(
      listSource.length,
      Math.ceil((desktopScrollTop + desktopHeight) / DESKTOP_ROW_HEIGHT) + OVERSCAN
    );
    const items = listSource.slice(startIndex, endIndex);

    return { items, totalHeight, startIndex };
  }, [virtualize, listSource, desktopScrollTop, desktopHeight]);

  const mobileVirtual = useMemo(() => {
    if (!virtualize) {
      return {
        items: listSource,
        totalHeight: 0,
        startIndex: 0,
      };
    }

    const totalHeight = listSource.length * MOBILE_ROW_HEIGHT;
    const startIndex = Math.max(0, Math.floor(mobileScrollTop / MOBILE_ROW_HEIGHT) - OVERSCAN);
    const endIndex = Math.min(
      listSource.length,
      Math.ceil((mobileScrollTop + mobileHeight) / MOBILE_ROW_HEIGHT) + OVERSCAN
    );
    const items = listSource.slice(startIndex, endIndex);

    return { items, totalHeight, startIndex };
  }, [virtualize, listSource, mobileScrollTop, mobileHeight]);

  const onDesktopScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setDesktopScrollTop(e.currentTarget.scrollTop);
  }, []);

  const onMobileScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setMobileScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Analysis History</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'analysis' : 'analyses'}
                {statusFilter !== 'all' && ` (${statusFilter})`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  await refreshHistory();
                  toast.success('History refreshed', 2000);
                } catch (err) {
                  setError(err);
                  toast.error('Failed to refresh history', 5000);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              isLoading={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showFilters && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by filename or job ID..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Filter:</span>
                {(['all', 'done', 'failed', 'running', 'queued'] as StatusFilter[]).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                    {statusCounts[status] > 0 && (
                      <span className="ml-1 text-xs">({statusCounts[status]})</span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {listSource.length === 0 ? (
            <EmptyState
              title={
                searchQuery || statusFilter !== 'all'
                  ? 'No analyses match your filters'
                  : 'No analyses yet'
              }
              subtitle={
                searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Upload a video to generate your first analysis'
              }
            />
          ) : (
            <>
              <div className="hidden md:block">
                <div className="grid grid-cols-[180px_1fr_170px_90px_130px] px-4 py-3 text-sm font-semibold text-gray-700 border-b border-gray-200 bg-white sticky top-0 z-10">
                  <div>Date</div>
                  <div>Video Name</div>
                  <div>Status</div>
                  <div>Throws</div>
                  <div>Actions</div>
                </div>
                <div
                  ref={desktopListRef}
                  className="max-h-[520px] overflow-auto border border-gray-200 rounded-lg"
                  onScroll={virtualize ? onDesktopScroll : undefined}
                >
                  <div
                    className="relative"
                    style={virtualize ? { height: desktopVirtual.totalHeight } : undefined}
                  >
                    {(virtualize ? desktopVirtual.items : listSource).map((job, idx) => {
                      const index = virtualize ? desktopVirtual.startIndex + idx : idx;
                      const rowStyle = virtualize
                        ? { top: index * DESKTOP_ROW_HEIGHT, height: DESKTOP_ROW_HEIGHT }
                        : undefined;
                      return (
                        <div
                          key={job.job_id}
                          className={`grid grid-cols-[180px_1fr_170px_90px_130px] px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${virtualize ? 'absolute left-0 right-0' : ''}`}
                          style={rowStyle}
                          onClick={() => handleJobClick(job.job_id)}
                        >
                          <div className="text-sm text-gray-600 whitespace-nowrap">
                            <div>{formatRelativeTime(job.created_at_unix)}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {fmtDate(job.created_at_unix)}
                            </div>
                          </div>
                          <div className="text-sm">
                            <div className="font-medium text-gray-900 truncate max-w-xs">
                              {job.original_filename || '(unknown)'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 font-mono">
                              {job.job_id.slice(0, 8)}...
                            </div>
                          </div>
                          <div className="text-sm">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={job.status} />
                              {job.status === 'running' && typeof job.progress === 'number' && (
                                <span className="text-xs text-gray-500">
                                  {Math.round((job.progress || 0) * 100)}%
                                </span>
                              )}
                            </div>
                            {job.error_message && (
                              <div className="text-xs text-red-600 mt-1 truncate max-w-xs">
                                {job.error_message}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {typeof job.throws_detected === 'number' ? job.throws_detected : '-'}
                          </div>
                          <div className="text-sm">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleJobClick(job.job_id)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => handleDelete(job.job_id, e)}
                                disabled={deletingJobId === job.job_id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete analysis"
                              >
                                {deletingJobId === job.job_id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                ref={mobileListRef}
                className="md:hidden max-h-[560px] overflow-auto space-y-3"
                onScroll={virtualize ? onMobileScroll : undefined}
              >
                <div
                  className="relative"
                  style={virtualize ? { height: mobileVirtual.totalHeight } : undefined}
                >
                  {(virtualize ? mobileVirtual.items : listSource).map((job, idx) => {
                    const index = virtualize ? mobileVirtual.startIndex + idx : idx;
                    const cardStyle = virtualize
                      ? { top: index * MOBILE_ROW_HEIGHT, height: MOBILE_ROW_HEIGHT }
                      : undefined;
                    return (
                      <Card
                        key={job.job_id}
                        className={`hover:shadow-md transition-shadow cursor-pointer ${virtualize ? 'absolute left-0 right-0' : ''}`}
                        style={cardStyle}
                        onClick={() => handleJobClick(job.job_id)}
                      >
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 truncate">
                                  {job.original_filename || '(unknown)'}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatRelativeTime(job.created_at_unix)}
                                </p>
                              </div>
                              <StatusBadge status={job.status} />
                            </div>

                            <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
                              <div>
                                {typeof job.throws_detected === 'number' && (
                                  <span>{job.throws_detected} throws</span>
                                )}
                              </div>
                              <div className="text-xs font-mono text-gray-400">
                                {job.job_id.slice(0, 8)}...
                              </div>
                            </div>

                            {job.error_message && (
                              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                                {job.error_message}
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleJobClick(job.job_id)}
                                className="flex-1"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => handleDelete(job.job_id, e)}
                                disabled={deletingJobId === job.job_id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {deletingJobId === job.job_id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {showPagination && totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredJobs.length)} of{' '}
                    {filteredJobs.length} analyses
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm text-gray-600 px-2">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default memo(JobHistory);
