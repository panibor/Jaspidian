import type { Config } from "tailwindcss";

export default {
  content: ["./popup.html", "./options.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        surface: "var(--color-surface)",
        "surface-muted": "var(--color-surface-muted)",
        border: "var(--color-border)",
        "border-subtle": "var(--color-border-subtle)",
        primary: "var(--color-primary)",
        "primary-foreground": "var(--color-primary-foreground)",
        warning: "var(--color-warning)",
        "warning-muted": "var(--color-warning-muted)",
        success: "var(--color-success)",
        "success-muted": "var(--color-success-muted)",
        danger: "var(--color-danger)",
        "danger-muted": "var(--color-danger-muted)",
        muted: "var(--color-muted)"
      },
      fontFamily: {
        ui: ["Segoe UI", "system-ui", "sans-serif"],
        mono: ["Consolas", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        panel: "0 8px 24px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
