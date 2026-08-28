import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useGetSlackStatusQuery, useDisconnectSlackMutation } from "./slackApi";
import { Button } from "../../components/Button";
import { Loader } from "../../components/Loader";

/**
 * SlackIntegrationView — Dedicated page for connecting and disconnecting Slack workspace.
 * Displays connection state, team information, and manages OAuth redirection parameters.
 */
export function SlackIntegrationView() {
  const { data: status, isLoading, refetch } = useGetSlackStatusQuery();
  const [disconnect, { isLoading: isDisconnecting }] = useDisconnectSlackMutation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Listen for callback redirect parameter `slack=connected`
  useEffect(() => {
    if (searchParams.get("slack") === "connected") {
      refetch();
      searchParams.delete("slack");
      setSearchParams(searchParams, { replace: true });
      toast.success("Slack workspace connected successfully!");
    }
  }, [searchParams, refetch, setSearchParams]);

  const handleConnect = () => {
    window.location.href = "/api/slack/oauth/authorize";
  };

  const handleDisconnect = async () => {
    try {
      await disconnect().unwrap();
      toast.success("Slack integration disconnected");
      refetch();
    } catch {
      toast.error("Failed to disconnect Slack workspace");
    }
  };

  if (isLoading) {
    return (
      <div className="py-20">
        <Loader size="lg" label="Loading integration state..." />
      </div>
    );
  }

  const isConnected = !!status?.connected;

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">
          Integrations
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
          Slack Integration
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Receive real-time Slack notifications whenever a sender mailbox hits its hourly limit.
        </p>
      </div>

      {/* Integration Card */}
      <div className="glass-card max-w-2xl p-8 flex flex-col md:flex-row items-center gap-8">
        {/* Slack visual logo */}
        <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
          </svg>
        </div>

        {/* Status description */}
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Slack Notifications</h3>
            <p className="text-sm text-slate-500 mt-1">
              Connect Email Scheduler to your Slack workspace. Once authorized, the scheduler will instantly push alert messages to your configured Slack channel when email sends are paused due to rate-limiting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Slack connected ✓
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Slack not connected
              </div>
            )}
          </div>

          <div className="pt-2">
            {isConnected ? (
              <Button
                variant="danger"
                onClick={handleDisconnect}
                isLoading={isDisconnecting}
              >
                Disconnect Workspace
              </Button>
            ) : (
              <Button variant="primary" onClick={handleConnect}>
                Connect Slack Workspace
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
