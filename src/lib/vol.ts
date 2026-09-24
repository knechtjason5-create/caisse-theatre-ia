const MAX_VOLS = 6;
let volsActifs = 0;

/**
 * Une petite bille part du bouton « + » et rejoint la barre « Encaisser » (élément marqué data-cible-panier).
 * Animation Web Animations (transform/opacity seulement) ; plafonnée pour rester fluide sur une tablette modeste.
 */
export function lancerVol(depart: DOMRect): void {
  if (typeof document === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || volsActifs >= MAX_VOLS) return;

  const x0 = depart.left + depart.width / 2;
  const y0 = depart.top + depart.height / 2;
  volsActifs++;

  // La barre n'existe pas encore au tout premier ajout : on laisse React la monter avant de viser.
  setTimeout(() => {
    const cible = document.querySelector<HTMLElement>("[data-cible-panier]");
    const c = cible?.getBoundingClientRect();
    const x1 = c ? c.left + 36 : window.innerWidth / 2;
    const y1 = c ? c.top + c.height / 2 : window.innerHeight - 96;
    const dx = x1 - x0;
    const dy = y1 - y0;

    const bille = document.createElement("div");
    Object.assign(bille.style, {
      position: "fixed",
      left: `${x0 - 7}px`,
      top: `${y0 - 7}px`,
      width: "14px",
      height: "14px",
      borderRadius: "9999px",
      background: "var(--ink)",
      boxShadow: "0 0 0 2px var(--bg)",
      zIndex: "75",
      pointerEvents: "none",
    });
    document.body.appendChild(bille);

    const fin = () => {
      bille.remove();
      volsActifs--;
      cible?.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.035)" }, { transform: "scale(1)" }],
        { duration: 240, easing: "ease-out" }
      );
    };
    const vol = bille.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1, offset: 0 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.45 - 56}px) scale(1.15)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.35)`, opacity: 0.25, offset: 1 },
      ],
      { duration: 540, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
    );
    vol.onfinish = fin;
    vol.oncancel = fin;
  }, 40);
}
