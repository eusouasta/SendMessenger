/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'selector', // Enable manual dark mode toggle (v4 syntax)
    theme: {
        extend: {
            colors: {
                whatsapp: {
                    light: '#25D366',
                    DEFAULT: '#128C7E',
                    dark: '#075E54'
                }
            }
        },
    },
    plugins: [],
}
