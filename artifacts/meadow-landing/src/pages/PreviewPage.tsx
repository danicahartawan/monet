import { useEffect, useRef, useState } from "react";

interface PreviewPageProps {
  name?: string;
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

const TABS = ["Journal", "Artifacts"] as const;
type Tab = (typeof TABS)[number];

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

const SpeechRecognitionCtor =
  typeof window !== "undefined"
    ? window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
    : null;

export default function PreviewPage({ name = "" }: PreviewPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Journal");
  const [today, setToday] = useState("");
  const [entries, setEntries] = useState<string[]>([]);
  const [newEntry, setNewEntry] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const displayName = name || "there";
  const greeting = getGreeting(displayName);

  function handleNewEntryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && newEntry.trim()) {
      setEntries((prev) => [newEntry.trim(), ...prev]);
      setNewEntry("");
    }
  }

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recognitionRef.current?.stop();
    };
  }, []);

  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
      streamRef.current = null;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
        setTranscript("");

        if (SpeechRecognitionCtor) {
          const recognition = new SpeechRecognitionCtor();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          let finalText = "";

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimText = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i];
              if (result.isFinal) {
                finalText += result[0].transcript;
              } else {
                interimText += result[0].transcript;
              }
            }
            setTranscript(finalText + interimText);
          };

          recognition.onerror = () => {
            recognitionRef.current = null;
          };

          recognition.onend = () => {
            if (recognitionRef.current !== null) {
              try {
                recognitionRef.current.start();
              } catch {
                recognitionRef.current = null;
              }
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        }
      } catch {
        // permission denied or not available — do nothing
      }
    }
  }

  const showTranscriptPanel = SpeechRecognitionCtor !== null && (isRecording || transcript.length > 0);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#F8F7F3] selection:bg-[#899E7F]/30">
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
        className="relative z-10 w-full h-full bg-[#6f8364]/25 backdrop-blur-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-700 overflow-hidden"
        style={{
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        <div className="flex h-full">
          {/* Left Panel */}
          <div className="flex flex-col w-full md:w-[300px] md:min-w-[260px] md:max-w-[320px] h-full md:border-r border-white/15 flex-shrink-0">
            {/* Branding */}
            <div className="px-6 pt-6 pb-4">
              <span className="text-xs tracking-[0.25em] font-medium uppercase text-[#F8F7F3]/70 font-sans">
                Monet
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

            {/* Voice Recording Button */}
            <div className="px-4 pb-4">
              <button
                onClick={toggleRecording}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 text-sm font-sans font-light ${
                  isRecording
                    ? "bg-red-500/20 border-red-400/40 text-red-200 hover:bg-red-500/30"
                    : "bg-white/10 hover:bg-white/18 border-white/10 text-[#F8F7F3]/75 hover:text-[#F8F7F3]"
                }`}
              >
                {isRecording ? (
                  <>
                    <span className="relative flex-shrink-0 w-3 h-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    Stop Recording
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                      <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    Start Connecting...
                  </>
                )}
              </button>
            </div>

            {/* Live Transcript Panel */}
            {showTranscriptPanel && (
              <div className="mx-4 mb-4 rounded-xl bg-black/20 border border-white/10 overflow-hidden flex flex-col">
                <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5">
                  {isRecording && (
                    <span className="relative flex-shrink-0 w-1.5 h-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400"></span>
                    </span>
                  )}
                  <span className="text-[10px] tracking-widest uppercase font-sans font-medium text-[#F8F7F3]/40">
                    {isRecording ? "Listening" : "Transcript"}
                  </span>
                </div>
                <div
                  ref={transcriptScrollRef}
                  className="px-3 pb-3 max-h-[120px] overflow-y-auto"
                >
                  {transcript ? (
                    <p className="text-xs font-sans font-light text-[#F8F7F3]/70 leading-relaxed whitespace-pre-wrap">
                      {transcript}
                    </p>
                  ) : (
                    <p className="text-xs font-sans font-light text-[#F8F7F3]/30 italic leading-relaxed">
                      Start speaking…
                    </p>
                  )}
                </div>
              </div>
            )}

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

            {/* Entry List */}
            <div className="flex-1 overflow-y-auto px-4">
              {entries.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-[#F8F7F3]/70 transition-all duration-150"
                >
                  <div className="w-4 h-4 rounded-full border border-[#F8F7F3]/25 flex-shrink-0" />
                  <span className="text-sm font-sans font-light">{entry}</span>
                </div>
              ))}

              {/* New Entry Input Row */}
              <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/8 transition-all duration-150 group">
                <div className="w-4 h-4 rounded-full border border-[#F8F7F3]/25 group-hover:border-[#F8F7F3]/40 flex-shrink-0 transition-colors" />
                <input
                  type="text"
                  value={newEntry}
                  onChange={(e) => setNewEntry(e.target.value)}
                  onKeyDown={handleNewEntryKeyDown}
                  placeholder="New..."
                  className="flex-1 bg-transparent text-sm font-sans font-light text-[#F8F7F3]/80 placeholder:text-[#F8F7F3]/40 placeholder:italic outline-none caret-[#F8F7F3]/60"
                />
              </div>
            </div>
          </div>

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
