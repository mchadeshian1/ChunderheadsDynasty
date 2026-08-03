import type { ReactNode } from 'react';

export type Mode = 'offseason' | 'inseason';

interface LayoutProps {
  children: ReactNode;
  mode: Mode;
  onToggleMode: () => void;
}

export function Layout({ children, mode, onToggleMode }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-100">
            Chunderheads Dynasty
          </h1>
          <button
            onClick={onToggleMode}
            className="relative flex h-8 items-center rounded-full bg-gray-800 p-0.5 text-xs font-semibold"
          >
            <span
              className={`relative z-10 rounded-full px-3 py-1 transition-colors ${
                mode === 'offseason' ? 'text-gray-100' : 'text-gray-500'
              }`}
            >
              Offseason
            </span>
            <span
              className={`relative z-10 rounded-full px-3 py-1 transition-colors ${
                mode === 'inseason' ? 'text-gray-100' : 'text-gray-500'
              }`}
            >
              In-Season
            </span>
            <span
              className={`absolute top-0.5 h-7 rounded-full bg-gray-600 transition-all ${
                mode === 'offseason'
                  ? 'left-0.5 w-[5.25rem]'
                  : 'left-[5.5rem] w-[5rem]'
              }`}
            />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl">{children}</main>
    </div>
  );
}
