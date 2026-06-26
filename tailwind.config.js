/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyberbg: '#04070C',
        cybercard: '#091019',
        cyberborder: '#12344A',
        cyberblue: '#00D4FF',
        cybercyan: '#32F3FF',
        cyberred: '#FF4040',
        cybergreen: '#00FF9D',
        cyberwhite: '#EAF7FF',
        cyberaccent: '#7DF9FF',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        sans: ['"Space Grotesk"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
