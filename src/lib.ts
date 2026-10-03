export type Lang = "en" | "hi";
export type Bi = { en: string; hi: string };
export type SceneKey = "salt" | "lanterns" | "tandoor" | "imarti" | "samosa" | "handi" | "chulha" | "road" | "cup" | "thali";
export type SectionKey = "dishes" | "gallery" | "feature" | "reviews" | "visit";
/** Opening hours per weekday, Sunday first, as [open, close] in decimal hours. Close may pass 24 (1 AM = 25). */
export type Hours = [number, number][];

export type Theme = {
  dark: boolean;
  bg: string;
  bg2: string;
  panel: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  accent: string;
  onAccent: string;
  /** CSS font-family name of the display face. */
  display: string;
  weight: number;
  upper: boolean;
};

export type Dish = { name: Bi; quote: string; img?: string };
export type Photo = { src: string; alt: string; wide?: boolean };
export type Review = { quote: string; stars: number };

export type Site = {
  name: string;
  sub: Bi;
  banner: Bi;
  phone: string;
  phoneDisplay: string;
  lat: number;
  lon: number;
  hours: Hours;
  price?: Bi;
  theme: Theme;
  scene: SceneKey;
  align: "left" | "right";
  hero: { title: [Bi, Bi]; proof: Bi; fallback: string };
  marquee: string[];
  dishes: { title: Bi; body: Bi; layout: "list" | "cards"; items: Dish[] };
  gallery: { title: Bi; layout: "strip" | "mosaic"; photos: Photo[] };
  feature: Feature;
  reviews: { title: Bi; rating: number; dist: [number, number, number, number, number]; quotes: Review[] };
  visit: { title: Bi; img: string; alt: string; address: Bi; note?: Bi };
  waHello: Bi;
  order: SectionKey[];
};

export type Feature =
  | { kind: "occasions"; title: Bi; body: Bi; img: string; items: { label: Bi; quote: string }[] }
  | { kind: "hosts"; title: Bi; body: Bi; img?: string; hosts: { name: string; quote: string }[] }
  | { kind: "thali"; title: Bi; body: Bi; img: string; items: { label: Bi; quote: string }[] }
  | { kind: "daynight"; title: Bi; body: Bi; day: { label: Bi; body: Bi; img: string; quote: string }; night: { label: Bi; body: Bi; img: string; quote: string } }
  | { kind: "counter"; title: Bi; body: Bi; img: string; items: { label: Bi; quote: string }[] }
  | { kind: "stopover"; title: Bi; body: Bi; quote: string; places: { label: Bi; lat: number; lon: number }[] };

export const bi = (b: Bi, lang: Lang) => b[lang];

export function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const fmtHour = (h: number) => {
  const x = h % 24;
  const hh = Math.floor(x);
  const mm = Math.round((x - hh) * 60);
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${hh < 12 ? "AM" : "PM"}`;
};

/** Live open state in IST, including hours that run past midnight. */
export function openState(hours: Hours, now: Date): { open: boolean; at: number } {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();
  const t = ist.getHours() + ist.getMinutes() / 60;
  const pc = hours[(day + 6) % 7][1];
  if (pc > 24 && t < pc - 24) return { open: true, at: pc };
  const [o, c] = hours[day];
  if (t >= o && t < c) return { open: true, at: c };
  return { open: false, at: t < o ? o : hours[(day + 1) % 7][0] };
}

export const DAYS: Record<Lang, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  hi: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
};

/** Interface strings shared by every restaurant site. */
export const UI = {
  en: {
    open: (t: string) => `Open now · till ${t}`,
    closed: (t: string) => `Closed now · opens ${t}`,
    call: "Call to book",
    callShort: "Call",
    whatsapp: "WhatsApp",
    directions: "Directions",
    reviews: "Google reviews",
    googleReview: "Google review",
    hours: "Hours",
    today: "Today",
    phone: "Phone",
    drag: "Drag to turn it around",
    scroll: "Scroll",
    kmAway: (n: string) => `${n} km`,
    outOf: "out of 5",
    lang: "Language",
    mapTitle: "Map",
    from: "from",
  },
  hi: {
    open: (t: string) => `अभी खुला है · ${t} तक`,
    closed: (t: string) => `अभी बंद है · ${t} खुलेगा`,
    call: "टेबल के लिए कॉल करें",
    callShort: "कॉल",
    whatsapp: "व्हाट्सऐप",
    directions: "रास्ता देखें",
    reviews: "गूगल रिव्यू",
    googleReview: "गूगल रिव्यू",
    hours: "समय",
    today: "आज",
    phone: "फ़ोन",
    drag: "घुमाकर देखिए",
    scroll: "नीचे देखें",
    kmAway: (n: string) => `${n} किमी`,
    outOf: "5 में से",
    lang: "भाषा",
    mapTitle: "नक्शा",
    from: "",
  },
};
