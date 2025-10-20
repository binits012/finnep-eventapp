'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { FaSun, FaMoon } from 'react-icons/fa';

type ThemeMode = 'light' | 'dark' | 'system';

declare global {
  interface Window {
    __setTheme?: (mode: ThemeMode) => void;
  }
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem('theme');
    return (stored === 'light' || stored === 'dark' ) ? stored : 'dark';
  });
  const pathname = usePathname();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Apply theme via root controller
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.__setTheme === 'function') {
      window.__setTheme(theme);
    } else {
      // Fallback: directly set root if runtime controller not yet available
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      } else {
        // system fallback
        const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
        const effective = mq && mq.matches ? 'dark' : 'light';
        if (effective === 'dark') {
          root.classList.add('dark');
          root.setAttribute('data-theme', 'dark');
        } else {
          root.classList.remove('dark');
          root.setAttribute('data-theme', 'light');
        }
      }
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const cycleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark'  : 'light'));
  };

  const buttonTitle = mounted ? (theme === 'dark' ? 'Switch to light mode' : theme === 'light' ? 'Switch to system (auto)' : 'Switch to light mode') : 'Toggle theme';
  const ButtonIcon = mounted ? (theme === 'dark' ? FaSun : FaMoon) : FaMoon;

  return (
    <header 
      className={`fixed w-full z-50 transition-all duration-300 overflow-x-hidden ${
        isScrolled ? 'backdrop-blur-md shadow-lg' : ''
      }`}
      style={{ background: isScrolled ? 'color-mix(in srgb, var(--background) 90%, transparent)' as any : 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 md:py-6">
          {/* Logo */}
          <Link href="/">
            <motion.div 
              className="flex items-center justify-center" 
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Image 
                src="/logo.png" 
                alt="Finnep Logo" 
                width={140} 
                height={100} 
                priority 
                className="h-10 w-auto object-contain"
              />
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {[
              { href: "/events", label: "Events" },
              
              //{ href: "/about", label: "About" },
              { href: "/merchant", label: "Merchant" },
            ].map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`relative font-medium text-base transition-colors duration-200
                  ${pathname === link.href 
                    ? 'text-indigo-600 dark:text-indigo-400' 
                    : 'hover:text-indigo-500 dark:hover:text-indigo-400'
                  }`}
              >
                {link.label}
                {pathname === link.href && (
                  <motion.span 
                    className="absolute bottom-[-8px] left-0 w-full h-[3px] bg-indigo-500 rounded-full"
                    layoutId="underline"
                  />
                )}
              </Link>
            ))}

            {/* Theme Switcher - Desktop (cycle system -> light -> dark) */}
            <button
              onClick={cycleTheme}
              aria-label="Toggle theme"
              className="ml-2 inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title={buttonTitle}
              style={{ borderWidth: 1, borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              <ButtonIcon className={mounted && theme === 'dark' ? 'text-yellow-400' : undefined} />
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {/* Theme Switcher - Mobile */}
            <button
              onClick={cycleTheme}
              aria-label="Toggle theme"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title={buttonTitle}
              style={{ borderWidth: 1, borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              <ButtonIcon className={mounted && theme === 'dark' ? 'text-yellow-400' : undefined} />
            </button>

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="focus:outline-none"
              style={{ color: 'var(--foreground)' }}
            >
              <span className="sr-only">Open menu</span>
              <div className="w-6 flex items-center justify-center relative">
                <span 
                  className={`block w-6 h-0.5 bg-current transform transition duration-300 ease-in-out ${
                    isMobileMenuOpen ? 'rotate-45 translate-y-1' : ''
                  }`}
                />
                <span 
                  className={`block absolute h-0.5 bg-current transform transition-all duration-300 ease-in-out ${
                    isMobileMenuOpen ? 'opacity-0 translate-x-3' : 'w-6'
                  }`}
                  style={{ top: '0.55rem' }}
                />
                <span 
                  className={`block w-6 h-0.5 bg-current transform transition duration-300 ease-in-out ${
                    isMobileMenuOpen ? '-rotate-45 -translate-y-1' : ''
                  }`}
                  style={{ top: '1.1rem' }}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div 
        className={`md:hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen 
            ? 'opacity-100 max-h-64' 
            : 'opacity-0 max-h-0 pointer-events-none'
        }`}
      >
        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <nav className="flex flex-col space-y-4">
            {[
              { href: "/events", label: "Events" },
              { href: "/dashboard", label: "Dashboard" },
              { href: "/about", label: "About" }
            ].map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`font-medium text-base px-3 py-2 rounded-md transition-colors duration-200
                  ${pathname === link.href 
                    ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-gray-800' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ color: 'var(--foreground)' }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
