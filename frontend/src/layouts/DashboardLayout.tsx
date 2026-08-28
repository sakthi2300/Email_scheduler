import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/store";
import { logoutUser } from "../features/auth/authSlice";

// Page Views
import { DashboardOverview } from "../features/dashboard/DashboardOverview";
import { ScheduledTable } from "../features/emails/ScheduledTable";
import { SentTable } from "../features/emails/SentTable";
import { SendersList } from "../features/senders/SendersList";
import { SlackIntegrationView } from "../features/slack/SlackIntegrationView";
import { SettingsView } from "../features/settings/SettingsView";
import { ComposeModal } from "../features/emails/ComposeModal";

import { Button } from "../components/Button";
import {
  EnvelopeIcon,
  CalendarDaysIcon,
  PaperAirplaneIcon,
  ArrowRightStartOnRectangleIcon,
  MagnifyingGlassIcon,
  RectangleGroupIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  PlusIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

type TabId = "dashboard" | "scheduled" | "sent" | "senders" | "slack" | "settings";

/**
 * DashboardLayout — Main application container.
 * Features a clean left-navigation sidebar, top-right profile header,
 * and handles composing and elasticsearch searches globally.
 */
export function DashboardLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [searchParams] = useSearchParams();

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Slack connection auto-refetch callback detector
  useEffect(() => {
    if (searchParams.get("slack") === "connected") {
      setActiveTab("slack"); // Switch directly to Slack tab
    }
  }, [searchParams]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login", { replace: true });
  };

  // Nav Items Config
  const navItems = [
    { id: "dashboard" as TabId, label: "Dashboard", icon: RectangleGroupIcon },
    { id: "scheduled" as TabId, label: "Scheduled", icon: CalendarDaysIcon },
    { id: "sent" as TabId, label: "Sent", icon: PaperAirplaneIcon },
    { id: "senders" as TabId, label: "Senders", icon: UserGroupIcon },
    { id: "slack" as TabId, label: "Slack Integration", icon: ChatBubbleLeftRightIcon },
    { id: "settings" as TabId, label: "Settings", icon: Cog6ToothIcon },
  ];

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex">
      {/* ── Left Sidebar (Desktop) ── */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-100 flex-col justify-between shrink-0 h-screen sticky top-0">
        <div>
          {/* Logo Section */}
          <div className="px-6 py-5 flex items-center gap-2 border-b border-slate-50">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-5.5 h-5.5 rounded-full bg-blue-600 shadow-sm shadow-blue-600/10" />
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[17.5px] border-b-yellow-500" />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">Email Scheduler</span>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-6 space-y-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSearchQuery(""); // Clear search on tab switch
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
                    transition-all duration-200
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}

            {/* Direct Compose Action */}
            <button
              onClick={() => setIsComposeOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/10 hover:shadow-blue-500/25 mt-4"
            >
              <PlusIcon className="w-5 h-5" />
              Schedule Email
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: User Card */}
        <div className="p-4 border-t border-slate-50 space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-9 h-9 rounded-full ring-2 ring-white shadow-sm shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-extrabold text-white shrink-0">
                {user?.name?.[0] || "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">
                {user?.name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
            title="Logout"
          >
            <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Sidebar Panel */}
          <aside className="relative flex flex-col w-64 max-w-xs bg-white h-full p-4 border-r border-slate-100 animate-slide-up justify-between">
            <div>
              {/* Mobile Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-5.5 h-5.5 rounded-full bg-blue-600" />
                  <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[15.5px] border-b-yellow-500" />
                  <h1 className="text-lg font-bold text-slate-900">Email Scheduler</h1>
                </div>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Nav Links */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSearchQuery("");
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold
                        transition-all
                        ${
                          isActive
                            ? "bg-blue-50 text-blue-600"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setIsComposeOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all mt-4 shadow-sm"
                >
                  <PlusIcon className="w-5 h-5" />
                  Schedule Email
                </button>
              </nav>
            </div>

            {/* Mobile Footer */}
            <div className="border-t border-slate-50 pt-4 space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-9 h-9 rounded-full"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-extrabold text-white">
                    {user?.name?.[0] || "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Layout Panel ── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-md px-8 py-5 flex items-center justify-between lg:justify-end shrink-0">
          {/* Mobile hamburger menu */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-50 text-slate-500"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          {/* Header Controls (Search + Notification + Profile Dropdown) */}
          <div className="flex items-center gap-4">
            {/* Search Input (Global, visible only on Scheduled / Sent tabs) */}
            {(activeTab === "scheduled" || activeTab === "sent") && (
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Search ${activeTab} emails...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-slate-800 placeholder:text-slate-400 w-48 sm:w-64 transition-all"
                />
                <MagnifyingGlassIcon className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3" />
              </div>
            )}

            {/* Notification Bell */}
            <button className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 relative transition-colors">
              <BellIcon className="w-5.5 h-5.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
            </button>

            {/* User Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-8 h-8 rounded-full ring-2 ring-slate-100"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-extrabold text-white">
                    {user?.name?.[0] || "?"}
                  </div>
                )}
                <span className="hidden sm:block text-sm font-bold text-slate-700">
                  {user?.name}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-slate-400" />
              </button>

              {/* Profile Dropdown */}
              {isProfileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-100 rounded-xl shadow-lg py-1.5 z-40 animate-fade-in">
                    <button
                      onClick={() => {
                        setActiveTab("settings");
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Account Settings
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-slate-50"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Main Dashboard Body ── */}
        <main className="flex-1 p-8 lg:p-10 max-w-[1440px] w-full mx-auto overflow-y-auto">
          {activeTab === "dashboard" && <DashboardOverview />}
          {activeTab === "scheduled" && <ScheduledTable search={debouncedQuery} onBack={() => { setActiveTab("dashboard"); setSearchQuery(""); }} />}
          {activeTab === "sent" && <SentTable search={debouncedQuery} onBack={() => { setActiveTab("dashboard"); setSearchQuery(""); }} />}
          {activeTab === "senders" && <SendersList />}
          {activeTab === "slack" && <SlackIntegrationView />}
          {activeTab === "settings" && <SettingsView />}
        </main>
      </div>

      {/* Compose modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />
    </div>
  );
}
