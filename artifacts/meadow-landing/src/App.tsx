import { useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, useSearch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import moulin from "@assets/moulin_1775445825141.jpg";
import PreviewPage from "./pages/PreviewPage";

const queryClient = new QueryClient();

function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [, navigate] = useLocation();

  const getFirstName = (e: string): string => {
    const local = e.split("@")[0];
    const name = local.split(/[._\-+]/)[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("submitting");
    setTimeout(() => {
      setStatus("success");
      const firstName = getFirstName(email);
      setTimeout(() => {
        navigate(`/preview?name=${encodeURIComponent(firstName)}`);
      }, 600);
    }, 1000);
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center p-4 selection:bg-white/30">
      {/* Background Painting */}
      <div className="absolute inset-0 pointer-events-none">
        <img src={moulin} alt="" className="w-full h-full object-cover object-center" style={{ filter: 'blur(4px)', transform: 'scale(1.04)' }} />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Main Card */}
      <div 
        className="relative z-10 w-full max-w-md mx-auto bg-[#6f8364]/30 backdrop-blur-2xl border border-white/20 p-8 md:p-10 rounded-[32px] shadow-2xl animate-in fade-in zoom-in-95 duration-1000 flex flex-col justify-between min-h-[400px]"
        style={{ 
          boxShadow: "0 25px 50px -12px rgba(111, 131, 100, 0.25), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        <div className="flex flex-col text-[#F8F7F3]">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl md:text-[48px] font-serif font-light tracking-tight leading-[1.1]">
              map your mind.
            </h1>
            <img src="/logo-white.png" alt="Monet logo" className="h-10 md:h-12 w-auto" />
          </div>
          
          <p className="text-base md:text-lg font-serif font-light opacity-90 leading-[1.6] max-w-[340px]">
            monet is an intelligent, voice-powered AI assistant designed to be your personal thought partner.
          </p>
        </div>

        <div className="mt-10 pt-5 border-t border-[#F8F7F3]/20">
          {status === "success" ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[40px] flex items-center">
              <p className="text-lg font-serif italic text-[#F8F7F3] opacity-90">
                Taking you in…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center group relative h-[40px]">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email here!" 
                required
                disabled={status === "submitting"}
                className="w-full bg-transparent border-none outline-none text-[#F8F7F3] placeholder:text-[#F8F7F3]/60 font-serif text-[17px] font-light focus:ring-0 disabled:opacity-50"
                data-testid="input-email"
              />
              <button 
                type="submit"
                disabled={status === "submitting" || !email}
                className="p-2 transition-transform duration-500 group-focus-within:translate-x-2 hover:translate-x-2 disabled:opacity-50 flex items-center justify-center"
                data-testid="button-submit"
                aria-label="Join Waitlist"
              >
                {status === "submitting" ? (
                  <svg className="animate-spin h-6 w-6 text-[#F8F7F3]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                    <path d="M5 12H19" stroke="#F8F7F3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 5L19 12L12 19" stroke="#F8F7F3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewRoute() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const name = params.get("name") ?? "";
  return <PreviewPage name={name} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/preview" component={PreviewRoute} />
      <Route component={Home} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
