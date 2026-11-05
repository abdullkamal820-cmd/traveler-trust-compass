import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('stid-theme', next ? 'dark' : 'light'); } catch { /* ignore */ }
  };
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`p-2 rounded-lg hover:bg-navy-100 text-navy-600 transition-colors ${className}`}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
