import React from 'react';
import { BookOpen, SlidersHorizontal } from 'lucide-react';

export type View = 'model' | 'methodology';

interface LayoutProps {
  view: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ view, onNavigate, children }) => {
  const navClass = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-emerald-600 text-white shadow-sm' : 'text-black/60 hover:text-black hover:bg-black/5'
    }`;

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-[#1a1a1a] font-sans">
      <header className="bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/mattjbayly/coho-growth-model"
            target="_blank"
            rel="noopener noreferrer"
            title="View source on GitHub"
            className="bg-[#1a1a1a] hover:bg-black p-2 rounded-lg transition-colors"
          >
            <svg viewBox="0 0 16 16" className="text-white w-6 h-6" fill="currentColor" aria-label="GitHub">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Simple Coho Bioenergetics Model</h1>
            <p className="text-xs text-black/50 font-medium">Growth &amp; Overwinter Survival with Temperature and Food Availability</p>
          </div>
        </div>
        <nav className="flex gap-1">
          <button onClick={() => onNavigate('model')} className={navClass(view === 'model')}>
            <SlidersHorizontal className="w-4 h-4" /> Model
          </button>
          <button onClick={() => onNavigate('methodology')} className={navClass(view === 'methodology')}>
            <BookOpen className="w-4 h-4" /> Methodology
          </button>
        </nav>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>
      <footer className="border-t border-black/5 py-8 mt-12 text-center text-sm text-black/40">
        <p>© 2026 M.J. Bayly Analytics Ltd.</p>
      </footer>
    </div>
  );
};
