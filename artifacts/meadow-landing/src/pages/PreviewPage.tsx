import { useEffect, useRef, useState } from "react";

interface PreviewPageProps {
  name?: string;
}

interface ExtractedNode {
  title: string;
  body: string;
}

interface ExtractedEdge {
  source: string;
  target: string;
  label?: string;
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

function buildMarkdown(nodes: ExtractedNode[], edges: ExtractedEdge[]): string {
  const parts: string[] = nodes.map((n) => `# ${n.title}\n\n${n.body}`);

  if (edges.length > 0) {
    const edgeLines = edges.map((e) =>
      e.label ? `- **${e.source}** → *${e.label}* → **${e.target}**` : `- **${e.source}** → **${e.target}**`
    );
    parts.push(`## Connections\n\n${edgeLines.join("\n")}`);
  }
  return parts.join("\n\n---\n\n");
}

function GraphView({ nodes, edges }: { nodes: ExtractedNode[]; edges: ExtractedEdge[] }) {
  if (nodes.length === 0) return null;

  const W = 520;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(cx, cy) - 64;

  const angleStep = (2 * Math.PI) / nodes.length;
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n, i) => {
    const angle = angleStep * i - Math.PI / 2;
    positions[n.title] = {
      x: nodes.length === 1 ? cx : cx + R * Math.cos(angle),
      y: nodes.length === 1 ? cy : cy + R * Math.sin(angle),
    };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ maxHeight: 360 }}>
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(248,247,243,0.4)" />
        </marker>
      </defs>

      {edges.map((e, i) => {
        const s = positions[e.source];
        const t = positions[e.target];
        if (!s || !t) return null;
        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nodeR = 28;
        const sx = s.x + (dx / len) * nodeR;
        const sy = s.y + (dy / len) * nodeR;
        const tx = t.x - (dx / len) * (nodeR + 6);
        const ty = t.y - (dy / len) * (nodeR + 6);

        return (
          <g key={i}>
            <line
              x1={sx} y1={sy} x2={tx} y2={ty}
              stroke="rgba(248,247,243,0.25)"
              strokeWidth="1.5"
              markerEnd="url(#arrow)"
            />
            {e.label && (
              <text
                x={mx} y={my - 6}
                textAnchor="middle"
                className="font-sans"
                fontSize="9"
                fill="rgba(248,247,243,0.45)"
              >
                {e.label}
              </text>
            )}
          </g>
        );
      })}

      {nodes.map((n) => {
        const p = positions[n.title];
        const words = n.title.split(" ");
        const lines: string[] = [];
        let current = "";
        for (const w of words) {
          if ((current + " " + w).trim().length > 10 && current) {
            lines.push(current);
            current = w;
          } else {
            current = current ? current + " " + w : w;
          }
        }
        if (current) lines.push(current);

        return (
          <g key={n.title}>
            <circle cx={p.x} cy={p.y} r={28} fill="rgba(248,247,243,0.12)" stroke="rgba(248,247,243,0.3)" strokeWidth="1" />
            {lines.map((line, li) => (
              <text
                key={li}
                x={p.x}
                y={p.y + (li - (lines.length - 1) / 2) * 11}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fill="rgba(248,247,243,0.85)"
                className="font-sans"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export default function PreviewPage({ name = "" }: PreviewPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Journal");
  const [today, setToday] = useState("");
  const [entries, setEntries] = useState<string[]>([]);
  const [newEntry, setNewEntry] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedNodes, setExtractedNodes] = useState<ExtractedNode[]>([]);
  const [extractedEdges, setExtractedEdges] = useState<ExtractedEdge[]>([]);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [rightView, setRightView] = useState<"markdown" | "graph">("markdown");
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

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

  async function runExtract(text: string) {
    setIsExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Extraction failed" }));
        setExtractError((err as { error?: string }).error ?? "Extraction failed");
        return;
      }
      const data = await res.json() as { nodes: ExtractedNode[]; edges: ExtractedEdge[] };
      setExtractedNodes(data.nodes ?? []);
      setExtractedEdges(data.edges ?? []);
    } catch {
      setExtractError("Could not reach the server. Make sure the API is running.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
      streamRef.current = null;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsRecording(false);

      const captured = transcriptRef.current.trim();
      if (captured) {
        await runExtract(captured);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
        setTranscript("");
        transcriptRef.current = "";
        setExtractedNodes([]);
        setExtractedEdges([]);
        setExtractError(null);

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
        // permission denied or not available
      }
    }
  }

  async function handleCopyMarkdown() {
    const md = buildMarkdown(extractedNodes, extractedEdges);
    await navigator.clipboard.writeText(md).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const showTranscriptPanel = SpeechRecognitionCtor !== null && (isRecording || transcript.length > 0);
  const hasResults = extractedNodes.length > 0;
  const markdown = hasResults ? buildMarkdown(extractedNodes, extractedEdges) : "";

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
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}
      >
        <div className="flex h-full">
          {/* ── Left Panel ── */}
          <div className="flex flex-col w-full md:w-[280px] md:min-w-[240px] md:max-w-[300px] h-full md:border-r border-white/15 flex-shrink-0">
            <div className="px-6 pt-6 pb-4" />

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
                <div ref={transcriptScrollRef} className="px-3 pb-3 max-h-[120px] overflow-y-auto">
                  {transcript ? (
                    <p className="text-xs font-sans font-light text-[#F8F7F3]/70 leading-relaxed whitespace-pre-wrap">{transcript}</p>
                  ) : (
                    <p className="text-xs font-sans font-light text-[#F8F7F3]/30 italic leading-relaxed">Start speaking…</p>
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
              <h2 className="text-lg font-serif font-light text-[#F8F7F3] leading-snug">{greeting}</h2>
            </div>

            {/* Daily Summary */}
            <div className="px-6 pb-5">
              <p className="text-xs text-[#F8F7F3]/60 font-sans font-light leading-relaxed">
                You have a clear day ahead. A good time to capture ideas, reflect on recent thoughts, and chip away at anything that's been on your mind.
              </p>
            </div>

            <div className="mx-6 border-t border-white/10 mb-4" />

            {/* Entry List */}
            <div className="flex-1 overflow-y-auto px-4">
              {entries.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-2 rounded-lg text-[#F8F7F3]/70 transition-all duration-150">
                  <div className="w-4 h-4 rounded-full border border-[#F8F7F3]/25 flex-shrink-0" />
                  <span className="text-sm font-sans font-light">{entry}</span>
                </div>
              ))}
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

          {/* ── Right Panel ── */}
          <div className="hidden md:flex flex-col flex-1 h-full overflow-hidden">
            {/* Right Panel Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/10 flex-shrink-0">
              <div className="flex gap-1 bg-white/10 rounded-lg p-0.5">
                {(["markdown", "graph"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setRightView(v)}
                    className={`px-3 py-1 text-xs font-sans font-medium rounded-md transition-all duration-200 capitalize ${
                      rightView === v
                        ? "bg-white/20 text-[#F8F7F3] shadow-sm"
                        : "text-[#F8F7F3]/50 hover:text-[#F8F7F3]/75"
                    }`}
                  >
                    {v === "markdown" ? "Markdown" : "Connections"}
                  </button>
                ))}
              </div>

              {hasResults && rightView === "markdown" && (
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/18 border border-white/10 text-[#F8F7F3]/60 hover:text-[#F8F7F3] text-xs font-sans transition-all duration-200"
                >
                  {copied ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Right Panel Body */}
            <div className="flex-1 overflow-hidden relative">
              {/* Loading */}
              {isExtracting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
                  <p className="text-sm text-[#F8F7F3]/50 font-sans font-light">Mapping your words…</p>
                </div>
              )}

              {/* Error */}
              {!isExtracting && extractError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8">
                  <p className="text-sm text-red-300/70 font-sans font-light text-center">{extractError}</p>
                </div>
              )}

              {/* Empty state */}
              {!isExtracting && !extractError && !hasResults && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-1">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#F8F7F3]/40">
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-sm text-[#F8F7F3]/40 font-sans font-light max-w-[220px] leading-relaxed">
                    Record yourself speaking and your words will be mapped into a knowledge graph here.
                  </p>
                </div>
              )}

              {/* Results — Markdown */}
              {!isExtracting && hasResults && rightView === "markdown" && (
                <div className="h-full overflow-y-auto px-8 py-6">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-[#F8F7F3]/80 leading-relaxed font-light">
                    {markdown}
                  </pre>
                </div>
              )}

              {/* Results — Connections graph */}
              {!isExtracting && hasResults && rightView === "graph" && (
                <div className="h-full overflow-y-auto px-6 py-6 flex flex-col gap-6">
                  {/* SVG graph */}
                  <div className="w-full flex items-center justify-center">
                    <GraphView nodes={extractedNodes} edges={extractedEdges} />
                  </div>

                  {/* Node list */}
                  <div className="grid grid-cols-1 gap-2">
                    {extractedNodes.map((n) => (
                      <div key={n.title} className="rounded-xl bg-white/8 border border-white/10 px-4 py-3">
                        <p className="text-xs font-sans font-semibold text-[#F8F7F3]/80 mb-1">{n.title}</p>
                        <p className="text-xs font-sans font-light text-[#F8F7F3]/55 leading-relaxed">{n.body}</p>
                      </div>
                    ))}
                  </div>

                  {/* Edge list */}
                  {extractedEdges.length > 0 && (
                    <div>
                      <p className="text-[10px] tracking-widest uppercase font-sans font-medium text-[#F8F7F3]/35 mb-2">Connections</p>
                      <div className="flex flex-col gap-1.5">
                        {extractedEdges.map((e, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs font-sans text-[#F8F7F3]/60">
                            <span className="font-medium text-[#F8F7F3]/75">{e.source}</span>
                            <span className="text-[#F8F7F3]/30">→</span>
                            {e.label && <span className="italic text-[#F8F7F3]/40">{e.label}</span>}
                            {e.label && <span className="text-[#F8F7F3]/30">→</span>}
                            <span className="font-medium text-[#F8F7F3]/75">{e.target}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
