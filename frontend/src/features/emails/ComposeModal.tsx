import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import {
  useScheduleEmailsMutation,
  useGetSendersQuery,
  useUploadLeadsMutation,
  useCreateSenderMutation,
} from "./emailApi";
import {
  PaperAirplaneIcon,
  CloudArrowUpIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ComposeModal — compose and schedule a new email batch.
 * Refactored with the clean, premium light theme.
 */
export function ComposeModal({ isOpen, onClose }: ComposeModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form State ──
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [leads, setLeads] = useState<string[]>([]);
  const [senderId, setSenderId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);

  // ── RTK Query ──
  const { data: sendersData } = useGetSendersQuery();
  const [scheduleEmails, { isLoading: isScheduling }] = useScheduleEmailsMutation();
  const [uploadLeads, { isLoading: isUploading }] = useUploadLeadsMutation();
  const [createSender, { isLoading: isCreatingSender }] = useCreateSenderMutation();

  const senders = sendersData?.data || [];

  // ── Handlers ──

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadLeads(formData).unwrap();
      setLeads(result.emails);
      toast.success(`${result.count} email addresses detected`);
    } catch {
      toast.error("Failed to parse lead file");
    }
  };

  const handleCreateSender = async () => {
    try {
      const result = await createSender({ hourlyLimit: 200 }).unwrap();
      setSenderId(result.id);
      toast.success(`Generated test SMTP account: ${result.smtpUser}`);
    } catch {
      toast.error("Failed to generate test SMTP account");
    }
  };

  const handleSchedule = async () => {
    if (!senderId) {
      toast.error("Please select a sender account");
      return;
    }
    if (!subject) {
      toast.error("Please enter a subject");
      return;
    }
    if (!body) {
      toast.error("Please enter a message body");
      return;
    }
    if (leads.length === 0) {
      toast.error("Please upload at least one recipient");
      return;
    }
    if (!startTime) {
      toast.error("Please select a schedule start time");
      return;
    }

    try {
      await scheduleEmails({
        subject,
        body,
        leads,
        senderId,
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmailsMs: delayMs,
        hourlyLimit,
      }).unwrap();

      toast.success(`Successfully scheduled campaign batch for ${leads.length} leads!`);
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err.data?.error?.message || "Failed to schedule emails");
    }
  };

  const resetForm = () => {
    setSubject("");
    setBody("");
    setLeads([]);
    setSenderId("");
    setStartTime("");
    setDelayMs(2000);
    setHourlyLimit(200);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose New Email Batch" size="xl">
      <div className="space-y-5 text-slate-800">
        {/* Sender Selection */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Sender Account
          </label>
          <div className="flex gap-2">
            <select
              id="sender-select"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
            >
              <option value="">Select a sender...</option>
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.smtpUser} (limit: {s.hourlyLimit}/hr)
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="md"
              onClick={handleCreateSender}
              isLoading={isCreatingSender}
              icon={<PlusCircleIcon className="w-4 h-4" />}
            >
              New Sender
            </Button>
          </div>
        </div>

        {/* Subject */}
        <Input
          label="Subject"
          placeholder="Your email subject line..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        {/* Body */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Body (HTML supported)
          </label>
          <textarea
            id="email-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Write your email body here... HTML is supported."
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 resize-none"
          />
        </div>

        {/* Lead Upload */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Recipients
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200"
          >
            <CloudArrowUpIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 font-semibold">
              {isUploading
                ? "Parsing file..."
                : leads.length > 0
                  ? `${leads.length} email addresses loaded`
                  : "Click to upload CSV or TXT file"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              CSV files should have an "email" column
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Lead Preview */}
          {leads.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {leads.slice(0, 8).map((email) => (
                <span
                  key={email}
                  className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600"
                >
                  {email}
                </span>
              ))}
              {leads.length > 8 && (
                <span className="px-2 py-0.5 text-xs text-slate-400">
                  +{leads.length - 8} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Scheduling Options */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Start Time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            label="Delay Between (ms)"
            type="number"
            value={delayMs}
            onChange={(e) => setDelayMs(Number(e.target.value))}
            placeholder="2000"
          />
          <Input
            label="Hourly Limit"
            type="number"
            value={hourlyLimit}
            onChange={(e) => setHourlyLimit(Number(e.target.value))}
            placeholder="200"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSchedule}
            isLoading={isScheduling}
            icon={<PaperAirplaneIcon className="w-4 h-4" />}
          >
            Schedule {leads.length > 0 ? `(${leads.length})` : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
