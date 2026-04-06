import { useEffect, useState } from "react";

interface PreviewPageProps {
  name?: string;
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

const TABS = ["Todo", "Inbox", "Flows"] as const;
type Tab = (typeof TABS)[number];

export default function PreviewPage({ name = "" }: PreviewPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Todo");
  const [today, setToday] = useState("");

  useEffect(() => {
    const d = new Date();
    setToday(
      d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  const displayName = name || "there";
  const greeting = getGreeting(displayName);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#F8F7F3] flex items-center justify-center selection:bg-[#899E7F]/30">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob bg-[#899E7F] w-[600px] h-[600px] top-[-100px] left-[-100px] mix-blend-multiply opacity-30" style={{ animationDelay: "0s" }}></div>
        <div className="blob bg-[#A2B395] w-[500px] h-[500px] top-[10%] right-[-50px] mix-blend-multiply opacity-40" style={{ animationDelay: "2s", animationDuration: "25s" }}></div>
        <div className="blob bg-[#D3DABF] w-[700px] h-[700px] bottom-[-200px] left-[10%] mix-blend-multiply opacity-50" style={{ animationDelay: "4s", animationDuration: "22s" }}></div>
        <div className="blob bg-[#718568] w-[400px] h-[400px] bottom-[20%] right-[15%] mix-blend-multiply opacity-20" style={{ animationDelay: "6s", animationDuration: "18s" }}></div>
        <div className="blob bg-[#C6D2B1] w-[600px] h-[600px] top-[30%] left-[30%] mix-blend-multiply opacity-30" style={{ animationDelay: "8s", animationDuration: "28s" }}></div>
      </div>

      {/* App Window */}
      <div
        className="relative z-10 w-full max-w-5xl mx-4 md:mx-8 bg-[#6f8364]/25 backdrop-blur-2xl border border-white/20 rounded-[32px] shadow-2xl animate-in fade-in zoom-in-95 duration-700 overflow-hidden"
        style={{
          boxShadow: "0 25px 50px -12px rgba(111, 131, 100, 0.25), inset 0 1px 0 rgba(255,255,255,0.2)",
          minHeight: "560px",
          height: "calc(100dvh - 48px)",
          maxHeight: "760px",
        }}
      >
        <div className="flex h-full">
          {/* Left Panel */}
          <div className="flex flex-col w-full md:w-[300px] md:min-w-[260px] md:max-w-[320px] h-full md:border-r border-white/15 flex-shrink-0">
            {/* Branding */}
            <div className="px-6 pt-6 pb-4">
              <span className="text-xs tracking-[0.25em] font-medium uppercase text-[#F8F7F3]/70 font-sans">
                Meadow
              </span>
            </div>

            {/* Tabs */}
            <div className="px-4 pb-3">
              <div className="flex gap-1 bg-white/10 rounded-xl p-1">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 text-xs font-medium font-sans rounded-lg transition-all duration-200 ${
                      activeTab === tab
                        ? "bg-white/20 text-[#F8F7F3] shadow-sm"
                        : "text-[#F8F7F3]/55 hover:text-[#F8F7F3]/80"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* New Chat Button */}
            <div className="px-4 pb-4">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/18 border border-white/10 transition-all duration-200 text-[#F8F7F3]/75 hover:text-[#F8F7F3] text-sm font-sans font-light">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                New Chat
              </button>
            </div>

            {/* Date */}
            <div className="px-6 pb-2">
              <p className="text-xs text-[#F8F7F3]/45 font-sans tracking-wide">{today}</p>
            </div>

            {/* Greeting */}
            <div className="px-6 pb-3">
              <h2 className="text-lg font-serif font-light text-[#F8F7F3] leading-snug">
                {greeting}
              </h2>
            </div>

            {/* Daily Summary */}
            <div className="px-6 pb-5">
              <p className="text-xs text-[#F8F7F3]/60 font-sans font-light leading-relaxed">
                You have a clear day ahead. A good time to capture ideas, reflect on recent thoughts, and chip away at anything that's been on your mind.
              </p>
            </div>

            {/* Divider */}
            <div className="mx-6 border-t border-white/10 mb-4" />

            {/* Todo List */}
            <div className="flex-1 overflow-y-auto px-4">
              <div className="flex items-center gap-2 px-2 py-2 rounded-lg text-[#F8F7F3]/40 hover:text-[#F8F7F3]/60 hover:bg-white/8 transition-all duration-150 cursor-pointer group">
                <div className="w-4 h-4 rounded-full border border-[#F8F7F3]/25 group-hover:border-[#F8F7F3]/40 flex-shrink-0 transition-colors" />
                <span className="text-sm font-sans font-light italic">New...</span>
              </div>
            </div>
          </div>

          {/* Vertical Divider (hidden on mobile, shown on md+) */}
          {/* Already handled by border-r above */}

          {/* Right Panel — only visible md+ */}
          <div className="hidden md:flex flex-1 items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4 text-center px-8 animate-in fade-in duration-500 delay-300">
              {/* Chat bubble icon */}
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-1">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-[#F8F7F3]/50">
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-sm text-[#F8F7F3]/50 font-sans font-light max-w-[200px] leading-relaxed">
                Select or create a todo to open a chat.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
