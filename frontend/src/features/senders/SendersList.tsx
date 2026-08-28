import { useState } from "react";
import toast from "react-hot-toast";
import { useGetSendersQuery, useCreateSenderMutation } from "../emails/emailApi";
import { Loader } from "../../components/Loader";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Input } from "../../components/Input";
import { PlusIcon, EnvelopeIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

/**
 * SendersList — Manages connected SMTP accounts.
 * Includes a form to configure hourly sending limits and register a new Ethereal account.
 */
export function SendersList() {
  const { data: sendersData, isLoading, isError, refetch } = useGetSendersQuery();
  const [createSender, { isLoading: isCreating }] = useCreateSenderMutation();

  // Form State
  const [hourlyLimit, setHourlyLimit] = useState(200);

  const handleCreateSender = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createSender({ hourlyLimit }).unwrap();
      toast.success(`Registered sender: ${result.smtpUser}`);
      refetch();
    } catch {
      toast.error("Failed to generate test Ethereal SMTP account");
    }
  };

  if (isLoading) {
    return (
      <div className="py-20">
        <Loader size="lg" label="Loading SMTP senders..." />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Failed to load senders"
        description="We couldn't connect to the database to fetch SMTP senders."
        action={
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const senders = sendersData?.data || [];

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Top Header */}
      <div>
        <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">
          Settings
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
          SMTP Senders
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Configure Ethereal SMTP accounts for sending test and campaign email schedules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Connection/Creation Form */}
        <div className="glass-card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-2">Add SMTP Sender</h3>
          <p className="text-xs text-slate-500 mb-6">
            Clicking register will automatically request and set up a new Ethereal SMTP test mailbox account for immediate use.
          </p>

          <form onSubmit={handleCreateSender} className="space-y-4">
            <Input
              label="Hourly Send Limit"
              type="number"
              min={1}
              max={1000}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value) || 200)}
              required
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isCreating}
              icon={<PlusIcon className="w-4 h-4" />}
            >
              Generate Sender
            </Button>
          </form>
        </div>

        {/* Senders List */}
        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="text-base font-bold text-slate-900 mb-4">Registered Mailboxes</h3>

          {senders.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <EnvelopeIcon className="w-12 h-12 stroke-1 text-slate-300 mb-3" />
              <p className="text-sm font-semibold">No senders found</p>
              <p className="text-xs text-slate-500 mt-1">Generate a test Ethereal SMTP mailbox using the form to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-2">SMTP Username / Email</th>
                    <th className="pb-3">Hourly Limit</th>
                    <th className="pb-3">Registered At</th>
                    <th className="pb-3 text-right pr-2">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {senders.map((sender) => (
                    <tr key={sender.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 pl-2 font-medium text-slate-900">
                        {sender.smtpUser}
                      </td>
                      <td className="py-3.5 text-slate-600">
                        {sender.hourlyLimit} emails/hr
                      </td>
                      <td className="py-3.5 text-slate-400">
                        {new Date(sender.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <a
                          href="https://ethereal.email/login"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
                        >
                          Ethereal login
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
