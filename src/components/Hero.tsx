import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { SITE } from "../content";
import { UI, bi, fmtHour, type Lang } from "../lib";
import { CallButton, DirectionsButton, EASE, Stars, WaButton } from "./ui";

const HOLD = 5200;

/** Full-screen cinematic hero: the restaurant's real photos crossfade with a slow push-in,
 *  the headline is unmasked line by line, and the copy sits on a solid panel (no scrims). */
export function Hero({ lang, reduced, open, wa }: { lang: Lang; reduced: boolean; open: { open: boolean; at: number }; wa: string }) {
  const t = UI[lang];
  const slides = SITE.hero.slides?.length ? SITE.hero.slides : [SITE.hero.backdrop ?? SITE.hero.fallback];
  const [i, setI] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const panelY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const rv = SITE.reviews;
  const total = rv.dist.reduce((x, y) => x + y, 0);
  const allday = SITE.hours.every((h) => h[0] === 0 && h[1] === 24);

  useEffect(() => {
    if (reduced || slides.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % slides.length), HOLD);
    return () => clearInterval(id);
  }, [reduced, slides.length]);

  const line = (d: number) => ({
    initial: reduced ? false : ({ y: "105%" } as const),
    animate: { y: "0%" },
    transition: { duration: 1.1, ease: EASE, delay: 0.35 + d },
  });
  const rise = (d: number) => ({
    initial: reduced ? false : ({ opacity: 0, y: 18 } as const),
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease: EASE, delay: 0.35 + d },
  });

  return (
    <section id="top" ref={ref} className="relative h-[100svh] min-h-[640px] overflow-hidden bg-bg">
      {/* photos */}
      <motion.div style={reduced ? undefined : { y: photoY }} className="absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.img
            key={slides[i]}
            src={slides[i]}
            alt=""
            aria-hidden
            initial={reduced ? false : { opacity: 0, scale: 1.18 }}
            animate={{ opacity: 1, scale: 1.02 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.4, ease: "easeInOut" }, scale: { duration: (HOLD + 1600) / 1000, ease: "linear" } }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
      </motion.div>

      {/* opening wipe: a solid accent bar sweeps off the photo once */}
      {!reduced && (
        <motion.div
          aria-hidden
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}
          className="absolute inset-0 origin-top bg-accent"
        />
      )}

      {/* slide counter + rating, top right under the header */}
      <motion.div {...rise(0.7)} className="absolute right-4 top-[118px] flex flex-col items-end gap-3 sm:right-8 md:top-[124px]">
        <div className="flex items-center gap-2.5 rounded-full bg-bg px-4 py-2 text-[14px] font-semibold text-ink">
          <Stars n={5} size={14} />
          <span className="tabular-nums">{rv.rating}</span>
          <span className="font-normal text-ink-2">· {total} Google reviews</span>
        </div>
        {slides.length > 1 && (
          <div className="hidden items-center gap-1.5 rounded-full bg-bg px-3 py-2 md:flex">
            {slides.map((s, n) => (
              <button key={s} onClick={() => setI(n)} aria-label={`Photo ${n + 1}`} className="relative h-1 w-8 overflow-hidden rounded-full bg-line">
                {n === i && (
                  <motion.span
                    key={i}
                    className="absolute inset-y-0 left-0 bg-accent"
                    initial={{ width: reduced ? "100%" : "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: reduced ? 0 : HOLD / 1000, ease: "linear" }}
                  />
                )}
                {n < i && <span className="absolute inset-0 bg-ink-3" />}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* copy on a solid panel, anchored bottom-left like a magazine cover */}
      <motion.div style={reduced ? undefined : { y: panelY }} className="absolute inset-x-0 bottom-0">
        <div className="mx-auto max-w-[1400px] md:px-8 md:pb-8">
          <motion.div
            initial={reduced ? false : { y: "100%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 1, ease: EASE, delay: 0.2 }}
            className="max-w-[700px] bg-bg px-4 pb-28 pt-7 sm:px-8 md:rounded-[28px] md:p-10"
          >
            <motion.p {...rise(0.15)} className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-line bg-bg-2 px-3.5 py-1.5 text-[14px] text-ink-2">
              <span className={`live-dot relative inline-block h-2 w-2 rounded-full ${open.open ? "bg-[#3ddc84] text-[#3ddc84]" : "bg-ink-3 text-ink-3"}`} />
              {allday ? t.allday : open.open ? t.open(fmtHour(open.at)) : t.closed(fmtHour(open.at))}
            </motion.p>
            <h1 className="font-display text-[clamp(2.5rem,5.6vw,5.2rem)] leading-[0.98] tracking-[-0.02em]">
              <span className="block overflow-hidden pb-[0.06em]">
                <motion.span {...line(0)} className="block">
                  {bi(SITE.hero.title[0], lang)}
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[0.06em]">
                <motion.span {...line(0.12)} className="block text-accent">
                  {bi(SITE.hero.title[1], lang)}
                </motion.span>
              </span>
            </h1>
            <motion.p {...rise(0.45)} className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2 md:text-[18px]">
              {bi(SITE.hero.proof, lang)}
            </motion.p>
            <motion.div {...rise(0.55)} className="mt-7 hidden flex-wrap gap-3 md:flex">
              <CallButton label={t.call} />
              <WaButton label={t.whatsapp} text={wa} />
              <DirectionsButton label={t.directions} />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
