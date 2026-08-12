/**
 * Footer completo de La Catedral del Pisco.
 * Incluye ubicación, horarios, contacto, redes sociales y créditos.
 */
export default function FooterWatermark() {
  return (
    <footer className="site-footer">

      {/* ── Logo marca de agua ─────────────────────────── */}
      <div className="site-footer__logo-wrap">
        <img
          src="/logo-catedral.jpg"
          alt="La Catedral del Pisco"
          className="site-footer__logo"
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* ── Separador con nombre ──────────────────────── */}
      <div className="site-footer__divider">
        <span className="site-footer__divider-line" />
        <span className="site-footer__divider-text">LA CATEDRAL DEL PISCO</span>
        <span className="site-footer__divider-line" />
      </div>

      {/* ── Grid de info ─────────────────────────────── */}
      <div className="site-footer__grid">

        {/* Ubicación y Horarios */}
        <section className="site-footer__block" aria-labelledby="footer-loc">
          <h3 id="footer-loc" className="site-footer__block-title">
            <span className="site-footer__icon" aria-hidden="true">📍</span>
            Dónde estamos
          </h3>
          <address className="site-footer__address">
            <a
              href="https://maps.google.com/?q=Av.+Corrientes+3126+Buenos+Aires"
              target="_blank"
              rel="noopener noreferrer"
              className="site-footer__link"
            >
              Av. Corrientes 3126<br />
              C1193 · CABA, Argentina
            </a>
          </address>
          <p className="site-footer__hours">
            <span className="site-footer__icon" aria-hidden="true">🕛</span>
            Mar – Dom · 12:00 a 00:00 hs
          </p>
        </section>

        {/* Contacto */}
        <section className="site-footer__block" aria-labelledby="footer-contact">
          <h3 id="footer-contact" className="site-footer__block-title">
            <span className="site-footer__icon" aria-hidden="true">✉️</span>
            Contacto
          </h3>
          <ul className="site-footer__contact-list">
            <li>
              <a
                href="https://wa.me/5491130597875"
                target="_blank"
                rel="noopener noreferrer"
                className="site-footer__link site-footer__link--whatsapp"
                aria-label="WhatsApp 11 3059-7875"
              >
                <svg className="site-footer__wa-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                11 3059-7875
              </a>
            </li>
            <li>
              <a
                href="tel:+541120716424"
                className="site-footer__link"
                aria-label="Teléfono 2071-6424"
              >
                <span className="site-footer__icon" aria-hidden="true">📞</span>
                2071-6424
              </a>
            </li>
          </ul>
        </section>

      </div>

      {/* ── Redes Sociales ───────────────────────────── */}
      <div className="site-footer__social">
        <p className="site-footer__social-label">¡Seguinos!</p>
        <div className="site-footer__social-links">
          <a
            href="https://www.instagram.com/lacatedraldelpisco"
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer__social-btn"
            aria-label="Instagram @lacatedraldelpisco"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4.5"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
            <span>@lacatedraldelpisco</span>
          </a>
          <a
            href="https://www.facebook.com/CatedraldelpiscoCABA"
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer__social-btn"
            aria-label="Facebook /CatedraldelpiscoCABA"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>/CatedraldelpiscoCABA</span>
          </a>
        </div>
      </div>

      {/* ── Créditos ─────────────────────────────────── */}
      <div className="site-footer__credits">
        <span className="site-footer__credits-copy">
          © {new Date().getFullYear()} La Catedral del Pisco
        </span>
        <span className="site-footer__credits-by">by Joaco &amp; Davo</span>
      </div>

    </footer>
  )
}
