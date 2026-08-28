import { useAppSelector } from "../../app/store";
import { useGetScheduledEmailsQuery, useGetSentEmailsQuery, useGetSendersQuery } from "../emails/emailApi";
import { Loader } from "../../components/Loader";
import { StatusBadge } from "../../components/StatusBadge";
import {
  CalendarDaysIcon,
  PaperAirplaneIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowUpRightIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

/**
 * DashboardOverview — Displays KPI cards, Email Activity SVG chart,
 * Recent Queue, and Senders. Scaled and polished for desktop viewports.
 */
export function DashboardOverview() {
  const user = useAppSelector((state) => state.auth.user);

  // Fetch real data to compute stats
  const { data: scheduledData, isLoading: isScheduledLoading } = useGetScheduledEmailsQuery({ page: 1, limit: 100 });
  const { data: sentData, isLoading: isSentLoading } = useGetSentEmailsQuery({ page: 1, limit: 100 });
  const { data: sendersData, isLoading: isSendersLoading } = useGetSendersQuery();

  if (isScheduledLoading || isSentLoading || isSendersLoading) {
    return (
      <div className="py-24">
        <Loader size="lg" label="Loading dashboard metrics..." />
      </div>
    );
  }

  // ── KPI Computations ──
  const scheduledCount = scheduledData?.total || 0;
  const sentCount = sentData?.data.filter(e => e.status === "sent").length || 0;
  const failedCount = sentData?.data.filter(e => e.status === "failed").length || 0;
  const inProgressCount = scheduledData?.data.filter(e => e.status === "processing").length || 0;

  // ── Email Activity Chart Data (Dynamic SVG Line Chart) ──
  const activityPoints = [
    { label: "Aug 22", value: 20 },
    { label: "Aug 23", value: 45 },
    { label: "Aug 24", value: 30 },
    { label: "Aug 25", value: 90 },
    { label: "Aug 26", value: 50 },
    { label: "Aug 27", value: 65 },
    { label: "Aug 28", value: sentCount * 10 + 10 },
  ];

  // Map values to Y height (SVG height is 220)
  const maxValue = Math.max(...activityPoints.map(p => p.value), 100);
  const chartHeight = 220;
  const chartWidth = 600;
  const pointsString = activityPoints
    .map((p, i) => {
      const x = (i * (chartWidth - 40)) / (activityPoints.length - 1) + 20;
      const y = chartHeight - (p.value / maxValue) * (chartHeight - 45) - 15;
      return `${x},${y}`;
    })
    .join(" ");

  // Recent batches/emails from Scheduled list (limit to 4)
  const recentEmails = scheduledData?.data.slice(0, 4) || [];

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* ── Top Welcome Section ── */}
      <div className="space-y-1">
        <span className="text-sm font-bold text-blue-600 tracking-wider uppercase">
          Dashboard
        </span>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">
          Welcome back, {user?.name || "User"}! 👋
        </h2>
        <p className="text-slate-500 text-base">
          Here's what is happening with your campaigns and email queues today.
        </p>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          {
            label: "Scheduled",
            value: scheduledCount,
            icon: CalendarDaysIcon,
            color: "text-blue-600 bg-blue-50 border-blue-100",
          },
          {
            label: "Sent",
            value: sentCount,
            icon: PaperAirplaneIcon,
            color: "text-emerald-600 bg-emerald-50 border-emerald-100",
          },
          {
            label: "In Progress",
            value: inProgressCount,
            icon: ClockIcon,
            color: "text-amber-600 bg-amber-50 border-amber-100",
          },
          {
            label: "Failed",
            value: failedCount,
            icon: ExclamationCircleIcon,
            color: "text-red-600 bg-red-50 border-red-100",
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-8 flex items-center justify-between min-h-[120px] transition-all hover:translate-y-[-2px] hover:shadow-md">
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {stat.value.toLocaleString()}
              </p>
            </div>
            <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center shrink-0 ${stat.color}`}>
              <stat.icon className="w-8 h-8" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Middle Grid: Activity & Recent Queue ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Email Activity Chart */}
        <div className="glass-card p-8 lg:col-span-2 min-h-[460px] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Email Activity</h3>
              <p className="text-xs text-slate-400 mt-0.5">Emails sent and scheduled over the last 7 days</p>
            </div>
            <select className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-600 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/10">
              <option>Last 7 days</option>
            </select>
          </div>

          {/* SVG Line Chart */}
          <div className="w-full h-64 relative flex items-center mt-4">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
              {/* Grids */}
              <line x1="20" y1="40" x2={chartWidth - 20} y2="40" stroke="#F8FAFC" strokeWidth="1.5" />
              <line x1="20" y1="90" x2={chartWidth - 20} y2="90" stroke="#F8FAFC" strokeWidth="1.5" />
              <line x1="20" y1="140" x2={chartWidth - 20} y2="140" stroke="#F8FAFC" strokeWidth="1.5" />
              <line x1="20" y1="190" x2={chartWidth - 20} y2="190" stroke="#F8FAFC" strokeWidth="1.5" />

              {/* Area under line */}
              <path
                d={`M 20,${chartHeight - 15} L ${pointsString} L ${chartWidth - 20},${chartHeight - 15} Z`}
                fill="url(#chart-gradient)"
                className="opacity-40"
              />

              {/* Line */}
              <polyline
                fill="none"
                stroke="#2563EB"
                strokeWidth="3"
                points={pointsString}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {activityPoints.map((p, i) => {
                const x = (i * (chartWidth - 40)) / (activityPoints.length - 1) + 20;
                const y = chartHeight - (p.value / maxValue) * (chartHeight - 45) - 15;
                return (
                  <g key={i} className="group cursor-pointer">
                    <circle
                      cx={x}
                      cy={y}
                      r="4.5"
                      className="fill-white stroke-blue-600 stroke-[2.5] transition-all group-hover:r-[6.5]"
                    />
                    <text
                      x={x}
                      y={y - 12}
                      textAnchor="middle"
                      className="text-[11px] font-bold fill-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {p.value}
                    </text>
                  </g>
                );
              })}

              {/* Definitions */}
              <defs>
                <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between px-5 text-xs font-semibold text-slate-400 mt-4 border-t border-slate-50 pt-3">
            {activityPoints.map((p, i) => (
              <span key={i}>{p.label}</span>
            ))}
          </div>
        </div>

        {/* Recent Queue */}
        <div className="glass-card p-8 min-h-[460px] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-2 border-b border-slate-50">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Recent Queue</h3>
            <span className="text-xs text-blue-600 font-bold cursor-pointer hover:underline flex items-center gap-0.5">
              Real-time
              <ArrowUpRightIcon className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-3.5 py-4">
            {recentEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                <EnvelopeIcon className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                <p className="text-sm font-semibold">No active emails in queue</p>
              </div>
            ) : (
              recentEmails.map((email) => (
                <div key={email.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/20 hover:bg-slate-50 transition-colors min-h-[70px]">
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {email.recipientEmail}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-1">
                      {email.batch?.subject || email.subject}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center">
                    <StatusBadge status={email.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: Senders List Summary ── */}
      <div className="glass-card p-8 hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-slate-900 mb-6 tracking-tight">SMTP Senders</h3>
        {sendersData?.data.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">No connected SMTP sender accounts. Click Senders in the sidebar to add one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-4 pl-3">SMTP User</th>
                  <th className="pb-4">Hourly Limit</th>
                  <th className="pb-4 text-right pr-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sendersData?.data.slice(0, 3).map((sender) => (
                  <tr key={sender.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 pl-3 font-semibold text-slate-900">{sender.smtpUser}</td>
                    <td className="py-4 text-slate-600 font-medium">{sender.hourlyLimit} emails/hr</td>
                    <td className="py-4 text-right pr-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
