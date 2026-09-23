/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MoveInSync-inspired green/teal enterprise palette
        background: "#F5F7F4",   // clean light green-grey canvas
        surface:    "#FFFFFF",   // pure white — cards, modals, drawers, tables
        primary:    "#0B6B5E",   // deep teal-green — buttons, active states, focus
        dark:       "#073F38",   // darkest green — sidebar, headings
        secondary:  "#2D806F",   // mid green — hover states, secondary actions
        accent:     "#8DBB5A",   // fresh lime-green accent — highlights, badges
        text:       "#18211F",   // near-black with green tint — all body text
        muted:      "#68736F",   // desaturated green-grey — labels, secondary text
        border:     "#DCE4DF",   // cool grey-green — all borders, dividers
        softgreen:  "#E7F1ED",   // very pale green — tinted backgrounds, badges
        success:    "#2D806F",   // green — ACTIVE/VALID states (matches secondary)
        danger:     "#C84D4D",   // clean red — BLOCKED/EXPIRED
        warning:    "#C58A32",   // amber — EXPIRING docs
      },
      fontFamily: {
        sans: ["Manrope", "DM Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm:  "4px",
        md:  "6px",
        lg:  "8px",
      },
    },
  },
  plugins: [],
};
