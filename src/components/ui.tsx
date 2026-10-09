import { animate, motion, useInView, useScroll, useTransform } from "motion/react";
import { NavigationArrow, Phone, Star, WhatsappLogo } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";
import { SITE } from "../content";

export const EASE = [0.16, 1, 0.3, 1] as const;
export const TEL = `tel:+${SITE.phone}`;
export const DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${SITE.lat},${SITE.lon}`;
export const waLink = (text: string) => `https://wa.me/${SITE.phone}?text=${encodeURIComponent(text)}`;

const PILL = "inline-flex items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-[16px] font-semibold transition duration-200 active:scale-[0.98]";

export function CallButton({ label, className = "" }: { label: string; className?: string }) {
  return (
    <a href={TEL} className={`${PILL} bg-accent text-on-accent hover:-translate-y-0.5 ${className}`}>
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

/** Section heading: the rule draws in, then the title rises word by word out of a mask. */
export function Heading({ index, title, body, reduced }: { index: string; title: string; body?: string; reduced: boolean }) {
  const words = title.split(" ");
  const view = { once: true, margin: "0px 0px -10% 0px" } as const;
  return (
    <div className="max-w-[760px]">
      <p className="mb-4 flex items-center gap-3 text-[13px] font-semibold tracking-[0.18em] text-accent">
        <span className="tabular-nums">{index}</span>
        <motion.span
          className="h-px w-10 origin-left bg-accent"
          initial={reduced ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={view}
          transition={{ duration: 0.8, ease: EASE }}
        />
      </p>
      <motion.h2
        className="font-display text-[clamp(2.3rem,5.4vw,4.4rem)] leading-[1] tracking-[-0.015em] text-balance"
        initial={reduced ? false : "hide"}
        whileInView="show"
        viewport={view}
      >
        {words.map((w, i) => (
          <span key={i}>
            <span className="inline-block overflow-hidden pb-[0.1em] align-bottom">
              <motion.span
                className="inline-block"
                variants={{ hide: { y: "110%" }, show: { y: "0%", transition: { duration: 0.9, ease: EASE, delay: i * 0.05 } } }}
              >
                {w}
              </motion.span>
            </span>
            {i < words.length - 1 && " "}
          </span>
        ))}
      </motion.h2>
      {body && (
        <motion.p
          className="mt-5 max-w-[58ch] text-[18px] leading-relaxed text-ink-2"
          initial={reduced ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={view}
          transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
        >
          {body}
        </motion.p>
      )}
    </div>
  );
}

/** A real photo that wipes open as it enters, then drifts against the scroll. */
export function Photo({ src, alt = "", className = "", reduced, delay = 0 }: { src: string; alt?: string; className?: string; reduced: boolean; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);
  return (
    <motion.div
      ref={ref}
      className={`relative overflow-hidden rounded-2xl bg-bg-2 ${className}`}
      initial={reduced ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 1.2, ease: EASE, delay }}
    >
      <motion.img src={src} alt={alt} loading="lazy" style={reduced ? undefined : { y, scale: 1.16 }} className="absolute inset-0 h-full w-full object-cover" />
    </motion.div>
  );
}

/** Counts up from zero the first time it scrolls into view. */
export function CountUp({ to, decimals = 0, reduced }: { to: number; decimals?: number; reduced: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || reduced) return;
    const c = animate(0, to, {
      duration: 1.8,
      ease: EASE,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = v.toFixed(decimals);
      },
    });
    return () => c.stop();
  }, [inView, reduced, to, decimals]);
  return <span ref={ref}>{(reduced ? to : 0).toFixed(decimals)}</span>;
}

export function Rise({ children, reduced, delay = 0, className = "" }: { children: ReactNode; reduced: boolean; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** A verbatim Google review line. */
export function Quote({ text, source, stars = 5, className = "" }: { text: string; source: string; stars?: number; className?: string }) {
  return (
    <figure className={`rounded-2xl border border-line bg-panel p-5 transition-colors duration-300 hover:border-ink-3 ${className}`}>
      <Stars n={stars} size={13} />
      <blockquote className="mt-3 text-[17px] leading-snug text-ink">“{text}”</blockquote>
      <figcaption className="mt-3 text-[13px] text-ink-3">{source}</figcaption>
    </figure>
  );
}
