/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./game/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                // [Amber-Glitch Palette]
                'amber-bg': '#2D1B2E',       // 深紫基底 (Deep Void)
                'amber-dark': '#1B1020',     // 陰影/槽位底色
                'amber-dim': '#665566',      // 非活性文字
                'amber-neon': '#FFCC00',     // 核心琥珀色 (Main Text/Border)
                'glitch-cyan': '#00FFFF',    // 故障高亮 (Highlight/Glitch)
                'glitch-pink': '#FF00FF',    // 警告/暴擊 (Crit/Warning)
                'hld-bg': '#0e0d16',
                'hld-cyan': '#00FFFF',
                'hld-magenta': '#FF0055',
            },
            fontFamily: {
                'mono': ['"VT323"', 'monospace'],
            },
            animation: {
                'spin-slow': 'spin 3s linear infinite',
                'flicker': 'flicker 0.15s infinite',
                'scanline': 'scanline 8s linear infinite',
            },
            keyframes: {
                flicker: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.8' },
                },
                scanline: {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(100%)' }
                }
            }
        },
    },
    plugins: [],
}
