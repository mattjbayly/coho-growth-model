import React from 'react';
import { motion } from 'motion/react';
import { Fish } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#f5f5f4] text-[#1a1a1a] font-sans">
      <header className="bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <Fish className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Simple Coho Bioenergetics Model</h1>
            <p className="text-xs text-black/50 font-medium">Growth &amp; Overwinter Survival with Temperature and Food Availability</p>
          </div>
        </div>
        <nav className="flex gap-6 text-sm font-medium text-black/60">
          <a href="#" className="hover:text-black transition-colors">Documentation</a>
          <a href="#" className="hover:text-black transition-colors">Methodology</a>
        </nav>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>
      <footer className="border-t border-black/5 py-8 mt-12 text-center text-sm text-black/40">
        <p>© 2026 Coho Growth and Survivorship Model. Built for Fisheries Science.</p>
      </footer>
    </div>
  );
};
