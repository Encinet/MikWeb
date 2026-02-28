'use client';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      backdropFilter: 'blur(16px) saturate(150%)',
      background: 'var(--glass-bg)',
      borderTop: '1px solid var(--glass-border)',
      padding: 'clamp(1.5rem, 4vw, 2rem) 0',
      marginTop: 'clamp(3rem, 6vw, 5rem)'
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <p style={{
          color: 'var(--text-muted)',
          fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
          marginBottom: '8px'
        }}>
          © 2021-{currentYear}{' '}
          <a
            href="https://encinet.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFAA00';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            Encinet
          </a>
          . All rights reserved.
        </p>
        <p style={{
          color: 'var(--text-dimmed)',
          fontSize: '0.75rem'
        }}>
          Minecraft is a trademark of Mojang AB. Encinet is not affiliated with Mojang AB. By using our services, you agree to{' '}
          <a
            href="https://www.minecraft.net/en-us/eula"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--text-dimmed)',
              textDecoration: 'underline',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFAA00';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-dimmed)';
            }}
          >
            Mojang's EULA
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
