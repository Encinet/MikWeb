export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '0 0 1rem 0',
      marginTop: 'clamp(3rem, 6vw, 5rem)'
    }}>
      <footer style={{
        width: '100%',
        maxWidth: 'min(95%, 1400px)',
        backdropFilter: 'blur(16px) saturate(150%)',
        WebkitBackdropFilter: 'blur(16px) saturate(150%)',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'clamp(12px, 2vw, 24px)',
        padding: 'clamp(1.5rem, 4vw, 2rem) 0'
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
              className="footer-link"
              style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s ease' }}
            >
              Encinet
            </a>
            . All rights reserved.
          </p>
          <p style={{ color: 'var(--text-dimmed)', fontSize: '0.75rem' }}>
            Minecraft is a trademark of Mojang AB. Encinet is not affiliated with Mojang AB. By using our services, you agree to{' '}
            <a
              href="https://www.minecraft.net/en-us/eula"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
              style={{ color: 'var(--text-dimmed)', textDecoration: 'underline', transition: 'color 0.2s ease' }}
            >
              Mojang&apos;s EULA
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
