import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#A644F3",
          deep: "#4A2D63",
          violet: "#7E37C5",
          dark: "#262628",
          bg: "#FAF6F5",
        },
        purple: {
          light: "#AE67E9",
          mid: "#9537E7",
        },
        smoke: "#e8e8ec",
        fog: "#FAF6F5",
        ink: "#262628",
        ash: "#5a5959",
      },
      fontFamily: {
        sans: ["DM Sans", "Helvetica Neue", "Helvetica", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        chip: "20px",
      },
      backgroundImage: {
        "brand-cinematic":
          "radial-gradient(ellipse at 25% 100%, #61417E 0%, #3a2a50 40%, #262628 70%), radial-gradient(ellipse at 72% 100%, #775A6C 0%, #4a3040 40%, transparent 65%)",
        "brand-cover":
          "radial-gradient(ellipse at 15% 60%, #4A2D63 0%, rgba(74,45,99,0.7) 40%, transparent 65%), radial-gradient(ellipse at 60% 30%, #3d2456 0%, rgba(61,36,86,0.5) 35%, transparent 60%), #1e1422",
        "nps-gradient":
          "linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(38,38,40,0.04), 0 0 0 1px rgba(38,38,40,0.04)",
        focus: "0 0 0 4px rgba(166,68,243,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
