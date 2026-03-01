'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, ChevronRight, Home, Wrench, Shield, Users, Zap, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap = {
  Home,
  Wrench,
  Shield,
  Users,
  Zap
};

interface Section {
  id: string;
  icon: string;
  label: string;
}

interface WikiClientProps {
  title: string;
  description: string;
  navigation: string;
  sections: Section[];
  content: Record<string, string>;
}

export default function WikiClient({ title, description, navigation, sections, content, initialSection }: WikiClientProps & { initialSection?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState(initialSection || 'getting-started');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section && content[section]) {
      setActiveSection(section);
    }
  }, [searchParams, content]);

  const handleSectionChange = (id: string) => {
    setActiveSection(id);
    setSidebarOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', id);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 animate-fadeIn">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-linear-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm border border-blue-400/30 shadow-lg">
              <BookOpen className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black" style={{ color: 'var(--text-secondary)' }}>{title}</h1>
          </div>
          <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-muted-light)' }}>
            {description}
          </p>
        </div>

        {/* Mobile Navigation - Bottom Right Popup Card */}
        <div className="lg:hidden fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl p-3 w-48"
                style={{
                  backdropFilter: 'blur(16px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(150%)',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                <nav className="space-y-1">
                  {sections.map((section) => {
                    const Icon = iconMap[section.icon as keyof typeof iconMap];
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => handleSectionChange(section.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 relative"
                        style={{
                          color: isActive ? 'var(--blue-accent)' : 'var(--text-muted-light)',
                          background: isActive ? 'var(--hover-bg)' : 'transparent',
                        }}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium">{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-3.5 rounded-full backdrop-blur-lg bg-blue-500/20 border border-blue-400/30 shadow-lg"
            style={{ color: 'var(--blue-accent)' }}
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <motion.div
              key={sidebarOpen ? 'close' : 'open'}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.div>
          </motion.button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div
              className="rounded-2xl p-4 lg:sticky lg:top-36"
              style={{
                backdropFilter: 'blur(16px) saturate(150%)',
                WebkitBackdropFilter: 'blur(16px) saturate(150%)',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <h3 className="font-semibold mb-4 px-2" style={{ color: 'var(--text-secondary)' }}>{navigation}</h3>
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = iconMap[section.icon as keyof typeof iconMap];
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSectionChange(section.id)}
                      style={{
                        color: isActive ? 'var(--blue-accent)' : 'var(--text-muted-light)',
                        background: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--hover-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 relative"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeBackground"
                          className="absolute inset-0 bg-blue-500/20 border border-blue-400/30 rounded-lg"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <Icon className="w-4 h-4 shrink-0 relative z-10" />
                      <span className="text-sm font-medium relative z-10">{section.label}</span>
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="ml-auto relative z-10"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl p-6 sm:p-8"
              style={{
                backdropFilter: 'blur(16px) saturate(150%)',
                WebkitBackdropFilter: 'blur(16px) saturate(150%)',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="prose prose-invert prose-blue max-w-none"
                >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 style={{ color: 'var(--text-secondary)', borderColor: 'var(--glass-border-light)' }} className="text-3xl font-bold mb-6 pb-3 border-b">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 style={{ color: 'var(--text-secondary)' }} className="text-2xl font-semibold mt-8 mb-4">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 style={{ color: 'var(--text-primary)' }} className="text-xl font-semibold mt-6 mb-3">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p style={{ color: 'var(--text-muted-lighter)' }} className="leading-relaxed mb-4">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul style={{ color: 'var(--text-muted-lighter)' }} className="list-disc list-inside space-y-2 mb-4">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol style={{ color: 'var(--text-muted-lighter)' }} className="list-decimal list-inside space-y-2 mb-4">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li style={{ color: 'var(--text-muted-lighter)' }} className="ml-4">
                        {children}
                      </li>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code style={{ background: 'var(--code-bg)' }} className="text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">
                          {children}
                        </code>
                      ) : (
                        <code style={{ background: 'var(--code-block-bg)', borderColor: 'var(--glass-border-light)' }} className="block text-green-300 p-4 rounded-lg overflow-x-auto text-sm font-mono border">
                          {children}
                        </code>
                      );
                    },
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-400/50 pl-4 py-2 my-4 bg-blue-500/10 rounded-r">
                        {children}
                      </blockquote>
                    ),
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        className="text-blue-400 hover:text-blue-300 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table style={{ borderColor: 'var(--glass-border-light)' }} className="min-w-full border rounded-lg overflow-hidden">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead style={{ background: 'var(--glass-bg-light)' }}>
                        {children}
                      </thead>
                    ),
                    th: ({ children }) => (
                      <th style={{ color: 'var(--text-secondary)', borderColor: 'var(--glass-border-light)' }} className="px-4 py-2 text-left font-semibold border-b">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td style={{ color: 'var(--text-muted-lighter)', borderColor: 'var(--border-light)' }} className="px-4 py-2 border-b">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {content[activeSection]}
                </ReactMarkdown>
              </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 1s ease-out;
        }
      `}</style>
    </div>
  );
}
