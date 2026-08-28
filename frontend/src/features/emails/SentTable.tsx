import { useState, useEffect } from "react";
import { useGetSentEmailsQuery } from "./emailApi";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { Loader } from "../../components/Loader";
import { Button } from "../../components/Button";
import {
  PaperAirplaneIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

interface SentTableProps {
  search: string;
  onBack: () => void;
}

/**
 * SentTable — displays paginated sent/failed emails
 * with filter, loading/empty/error states.
 * Includes a persistent Header / Back Navigation block.
 */
export function SentTable({ search, onBack }: SentTableProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // Reset to page 1 when the search query changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading, isError, refetch } = useGetSentEmailsQuery(
    {
      page,
      limit: 15,
      status: statusFilter,
      search,
    },
    { pollingInterval: 2000 }
  );

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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sent & Failed</h2>
          <p className="text-xs text-slate-400">Track and monitor your sent campaign email attempts</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="space-y-4">
        {/* Filter Buttons */}
        <div className="flex gap-2">
          {[
            { label: "All", value: undefined },
            { label: "Sent", value: "sent" },
            { label: "Failed", value: "failed" },
          ].map(({ label, value }) => (
            <button
              key={label}
              onClick={() => {
                setStatusFilter(value);
                setPage(1);
              }}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border
                ${
                  statusFilter === value
                    ? "bg-blue-50 text-blue-600 border-blue-200"
                    : "bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-50"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Dynamic States Area */}
        {isLoading ? (
          <div className="py-16">
            <Loader size="lg" label="Loading sent emails..." />
          </div>
        ) : isError ? (
          <EmptyState
            title="Something went wrong"
            description="We couldn't load your sent emails. Please try again."
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={<PaperAirplaneIcon className="w-8 h-8 text-slate-400" />}
            title={statusFilter === "failed" ? "No failed emails" : "No sent emails yet"}
            description={
              statusFilter === "failed"
                ? "No failed email attempts matched your criteria."
                : "Emails will appear here once they've been delivered."
            }
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
                        Sent Time
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Status
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
                          {email.sentTime
                            ? new Date(email.sentTime).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={email.status} />
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
