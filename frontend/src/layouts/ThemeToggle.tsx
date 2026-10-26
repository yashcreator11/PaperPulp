import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2 rounded hover:bg-sidebar transition"
      title="Toggle Theme"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
