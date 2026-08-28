import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useGetScheduledEmailsQuery, useDeleteEmailMutation } from "./emailApi";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { Loader } from "../../components/Loader";
import { Button } from "../../components/Button";
import {
  CalendarIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

interface ScheduledTableProps {
  search: string;
  onBack: () => void;
}

/**
 * ScheduledTable — displays paginated scheduled emails
 * with RTK Query loading/empty/error states.
 * Includes a persistent Header / Back Navigation block.
 */
export function ScheduledTable({ search, onBack }: ScheduledTableProps) {
  const [page, setPage] = useState(1);

  // Reset to page 1 when the search query changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading, isError, refetch } = useGetScheduledEmailsQuery(
    { page, limit: 15, search },
    { pollingInterval: 2000 }
  );
  const [deleteEmail, { isLoading: isDeleting }] = useDeleteEmailMutation();

  const handleDelete = async (id: string) => {
    try {
      await deleteEmail(id).unwrap();
      toast.success("Email cancelled successfully");
    } catch {
      toast.error("Failed to cancel email");
    }
  };

  const totalPages = data ? Math.ceil(data.total / 15) : 1;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* ── Header / Back Navigation ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-sm transition-all duration-200 active:scale-[0.97]"
        >
          <ArrowLeftIcon className="w-4 h-4 text-slate-500" />
          Back
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Scheduled Emails</h2>
          <p className="text-xs text-slate-400">Manage and monitor your upcoming campaign email delivery queue</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="space-y-4">
        {/* Dynamic States Area */}
        {isLoading ? (
          <div className="py-16">
            <Loader size="lg" label="Loading scheduled emails..." />
          </div>
        ) : isError ? (
          <EmptyState
            title="Something went wrong"
            description="We couldn't load your scheduled emails. Please try again."
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon className="w-8 h-8 text-slate-400" />}
            title="No scheduled emails"
            description="You haven't scheduled any emails yet. Click 'Schedule Email' in the sidebar to get started."
          />
        ) : (
          <>
            {/* Table */}
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Recipient
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Scheduled Time
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.data.map((email) => (
                      <tr
                        key={email.id}
                        className="hover:bg-slate-50/40 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-slate-800 font-semibold">
                          {email.recipientEmail}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                          {email.subject}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {new Date(email.scheduledTime).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={email.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleDelete(email.id)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Cancel email"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-sm text-slate-500 font-medium">
                  Page {page} of {totalPages} · {data.total} total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    icon={<ChevronLeftIcon className="w-4 h-4" />}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    icon={<ChevronRightIcon className="w-4 h-4" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
