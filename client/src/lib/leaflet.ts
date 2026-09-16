import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet used to be injected from a CDN by each map component. It is now
// bundled; components still reference `window.L`, so expose it once here.
declare global {
  interface Window {
    L: typeof L;
  }
}
window.L = L;

export default L;
