import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";
import StartTourButton from "@/layouts/StartTourButton";

export default function TourInfoPopup() {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={popupRef}>
      {/* Info Icon */}
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Tour Guide"
      >
        <Info className="h-5 w-5" />
      </button>

      {/* Popup */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-48 bg-card text-card-foreground shadow-xl rounded-xl p-4 border border-border animate-in fade-in z-50 backdrop-blur-md"
        >
          <h3 className="text-sm font-semibold mb-2 text-foreground">Tour Guide</h3>

          <StartTourButton />

          {/* Triangle Arrow */}
          <div className="absolute -top-1.5 right-3 w-3 h-3 bg-card rotate-45 border-l border-t border-border"></div>
        </div>
      )}
    </div>
  );
}
