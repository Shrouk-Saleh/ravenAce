import { createContext, useContext, useState, useEffect } from 'react'

// Dark mode is implemented with a single class ("dark") on the <html>
// element. Tailwind's `darkMode: "class"` config (already set in
// index.html) means every `dark:` variant in our classNames activates
// automatically when this class is present — no per-component logic
// needed beyond adding `dark:` classes where we want different colors.

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Restore the user's last choice, default to light
    return localStorage.getItem('theme') || 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
