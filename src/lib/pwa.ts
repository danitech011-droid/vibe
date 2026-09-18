// PWA service-worker registration wrapper.
// Registers /sw.js only in a real production install context — never in dev,
// never in Lovable previews, never inside an iframe. In any refused context it
// unregisters a stale matching SW so previews never serve stale shells.
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const host = window.location.hostname;
  const refused =
    !import.meta.env.PROD ||
    (window.parent !== undefined && window.parent !== window) ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev") ||
    new URLSearchParams(window.location.search).get("sw") === "off";

  if (refused) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) =>
        regs
          .filter((r) => r.active?.scriptURL.endsWith("/sw.js") || r.scope === window.location.origin + "/")
          .forEach((r) => r.unregister()),
      )
      .catch(() => undefined);
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
