import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useGetSlackStatusQuery, useDisconnectSlackMutation } from "./slackApi";
import { Button } from "../../components/Button";

/**
 * SlackConnectButton — shows Slack connection status
 * with connect/disconnect actions.
 */
export function SlackConnectButton() {
  const { data: status, isLoading, refetch } = useGetSlackStatusQuery();
  const [disconnect, { isLoading: isDisconnecting }] = useDisconnectSlackMutation();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("slack") === "connected") {
      refetch();
      // Clean up search param
      searchParams.delete("slack");
      setSearchParams(searchParams, { replace: true });
      toast.success("Slack connected successfully!");
    }
  }, [searchParams, refetch, setSearchParams]);

  const handleConnect = () => {
    window.location.href = "/api/slack/oauth/authorize";
  };

  const handleDisconnect = async () => {
    try {
      await disconnect().unwrap();
      toast.success("Slack disconnected");
    } catch {
      toast.error("Failed to disconnect Slack");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 text-xs text-surface-500">
        <div className="w-2 h-2 rounded-full bg-surface-600 animate-pulse" />
        Checking Slack...
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 text-xs text-success">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
          Slack Connected
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          isLoading={isDisconnecting}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-600/50 hover:bg-surface-700/50 text-xs text-surface-300 hover:text-surface-100 transition-all"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
      Connect Slack
    </button>
  );
}
