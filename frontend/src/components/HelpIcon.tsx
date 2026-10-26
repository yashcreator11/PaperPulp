import React from "react";
import { useLocation } from "react-router-dom";
import introJs from "intro.js"; // <- remove Steps import
import { HelpCircle } from "lucide-react";
import guidesMap from "@/guides"; // map of pathname -> steps
import "@/index.css";

// Define Step type for TypeScript
interface Step {
  element?: string;
  intro: string;
  position?: "top" | "left" | "right" | "bottom" | "auto";
}

const HelpIcon: React.FC = () => {
  const location = useLocation();

  const handleClick = () => {
    const pathname = location.pathname || "/";
    const steps: Step[] = guidesMap[pathname] ?? guidesMap["/"];

    if (!steps || steps.length === 0) {
      console.warn("No tour steps found for this page:", pathname);
      return;
    }

    introJs()
      .setOptions({
        steps,
        showProgress: true,
        showBullets: true,
        exitOnEsc: true,
        exitOnOverlayClick: false,
        tooltipClass: "customTooltip",
      })
      .start();
  };

  return (
    <div
      className="help-icon"
      onClick={handleClick}
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        background: "#2563eb",
        color: "white",
        padding: 10,
        borderRadius: "999px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 18px rgba(0,0,0,0.12)"
      }}
      aria-label="Open help tour"
      title="Open tour"
    >
      <HelpCircle size={22} />
    </div>
  );
};

export default HelpIcon;
