import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-bold text-gray-100">
            Chunderheads Dynasty
          </h1>
        </div>
      </header>
      <main className="mx-auto max-w-5xl">{children}</main>
    </div>
  );
}
