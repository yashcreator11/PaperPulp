// src/components/PageLoader.tsx
import React from "react";
import { useLocation } from "react-router-dom";

type PageLoaderProps = {
  isVisible: boolean;
};

const PageLoader: React.FC<PageLoaderProps> = ({ isVisible }) => {
  const location = useLocation();

  // ❌ Do NOT show loader on forbidden / not-found cases
  const disableLoader =
    location.pathname === "/forbidden" ||
    location.pathname === "/404";

  if (!isVisible || disableLoader) return null;
  const text = "PaperPulp Intelligence";

  return (
    <div
      aria-hidden={!isVisible}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl text-white gap-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <div className="text-2xl font-bold tracking-wider text-slate-100 flex gap-0.5">
          {text.split("").map((letter, i) => (
            <span
              key={i}
              style={{
                animation: `fadeInLetter 0.25s ease-out ${i * 0.03}s both`,
              }}
              className={i >= 9 ? "text-emerald-400 font-medium" : "text-slate-100"}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          ))}
        </div>
      </div>

      {/* Loading Progress Bar */}
      <div className="w-56 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full animate-[loadingBar_0.8s_ease-in-out_infinite]" />
      </div>

      <style>{`
        @keyframes fadeInLetter {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes loadingBar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default PageLoader;
