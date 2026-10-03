import { motion } from "motion/react";
import { NavigationArrow, Phone, Star, WhatsappLogo } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { SITE } from "../content";

export const EASE = [0.16, 1, 0.3, 1] as const;
export const TEL = `tel:+${SITE.phone}`;
export const DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${SITE.lat},${SITE.lon}`;
export const waLink = (text: string) => `https://wa.me/${SITE.phone}?text=${encodeURIComponent(text)}`;

const PILL = "inline-flex items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-[16px] font-semibold transition duration-200 active:scale-[0.98]";

export function CallButton({ label, className = "" }: { label: string; className?: string }) {
  return (
    <a href={TEL} className={`${PILL} bg-accent text-on-accent shadow-[0_12px_32px_-14px_var(--accent)] hover:-translate-y-0.5 ${className}`}>
      <Phone size={19} weight="fill" />
      {label}
    </a>
  );
}

export function WaButton({ label, text, className = "" }: { label: string; text: string; className?: string }) {
  return (
    <a href={waLink(text)} target="_blank" rel="noreferrer" className={`${PILL} group border border-wa/50 text-ink hover:bg-wa hover:text-[#062a14] ${className}`}>
      <WhatsappLogo size={20} weight="fill" className="text-wa group-hover:text-[#062a14]" />
      {label}
    </a>
  );
}

export function DirectionsButton({ label, className = "" }: { label: string; className?: string }) {
  return (
    <a href={DIRECTIONS} target="_blank" rel="noreferrer" className={`${PILL} border border-line text-ink-2 hover:border-accent/60 hover:text-ink ${className}`}>
      <NavigationArrow size={18} weight="fill" />
      {label}
    </a>
  );
}

export function Stars({ n = 5, size = 14 }: { n?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-accent" aria-label={`${n} stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} weight={i < n ? "fill" : "regular"} />
      ))}
    </span>
  );
}

/** Section heading: an eyebrow index plus a big display title that rises in. */
export function Heading({ index, title, body, reduced }: { index: string; title: string; body?: string; reduced: boolean }) {
  return (
    <div className="max-w-[760px]">
      <p className="mb-4 flex items-center gap-3 text-[13px] font-semibold tracking-[0.18em] text-accent">
        <span className="tabular-nums">{index}</span>
        <span className="h-px w-10 bg-accent/50" />
      </p>
      <motion.h2
        className="font-display text-[clamp(2.3rem,5.4vw,4.4rem)] leading-[0.98] tracking-[-0.015em] text-balance"
        initial={reduced ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-12% 0px" }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        {title}
      </motion.h2>
      {body && <p className="mt-5 max-w-[58ch] text-[18px] leading-relaxed text-ink-2">{body}</p>}
    </div>
  );
}

export function Rise({ children, reduced, delay = 0, className = "" }: { children: ReactNode; reduced: boolean; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** A verbatim Google review line. */
export function Quote({ text, source, stars = 5, className = "" }: { text: string; source: string; stars?: number; className?: string }) {
  return (
    <figure className={`rounded-2xl border border-line bg-panel p-5 ${className}`}>
      <Stars n={stars} size={13} />
      <blockquote className="mt-3 text-[17px] leading-snug text-ink">“{text}”</blockquote>
      <figcaption className="mt-3 text-[13px] text-ink-3">{source}</figcaption>
    </figure>
  );
}
