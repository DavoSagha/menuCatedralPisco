export default function FooterWatermark({ children = null }) {
  return (
    <footer className="menu-footer-mark">
      <img
        className="menu-footer-mark__watermark"
        src="/logo-catedral.jpg"
        alt="La Catedral del Pisco"
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        style={{
          opacity: 0.15,
          borderRadius: '50%',
          maxWidth: '400px',
          margin: '0 auto',
          display: 'block',
          alignSelf: 'center',
          userSelect: 'none',
          paddingBottom: '30px'
        }}
      />
      {children && <div className="menu-footer-mark__content">{children}</div>}
    </footer>
  )
}
