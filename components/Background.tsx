'use client';

export default function Background() {
  return (
    <div className="fixed inset-0 -z-10" style={{
      background: 'linear-gradient(160deg, var(--bg-gradient-from) 0%, var(--bg-gradient-to) 100%)',
      transition: 'background 0.3s ease'
    }}></div>
  );
}
