import { useCallback, useEffect, useState } from "react";

/**
 * Class-based dark mode (Tailwind `darkMode: "class"`). Reads the initial
 * value from localStorage (already applied pre-paint by a small inline
 * script in index.html) and keeps <html class="dark"> in sync afterwards.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light"
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Storage may be unavailable (private mode, etc.) — theme still works for this session.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
