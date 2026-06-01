"use client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button size="sm" variant="outline"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? "🌙" : "☀️"}
    </Button>
  );
}
