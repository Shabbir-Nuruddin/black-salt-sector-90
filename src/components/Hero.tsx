import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { SITE } from "../content";
import { UI, bi, fmtHour, type Lang } from "../lib";
import { CallButton, DirectionsButton, EASE, Stars, WaButton } from "./ui";

const HOLD = 5200;

/** Editorial split hero: copy set straight on the page in a column aligned with the logo,
 *  the restaurant's real photos run edge to edge beside it (no card, no scrims). */
export function Hero({ lang, reduced, open, wa }: { lang: Lang; reduced: boolean; open: { open: boolean; at: number }; wa: string }) {
  const t = UI[lang];
  const slides = SITE.hero.slides?.length ? SITE.hero.slides : [SITE.hero.backdrop ?? SITE.hero.fallback];
  const [i, setI] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const rv = SITE.reviews;
  const total = rv.dist.reduce((x, y) => x + y, 0);
  const allday = SITE.hours.every((h) => h[0] === 0 && h[1] === 24);
  const pad = (n: number) => String(n).padStart(2, "0");

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
    <section
      id="top"
      ref={ref}
      className="relative grid bg-bg pt-[var(--hdr,100px)] md:min-h-[max(100svh,720px)] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
    >
      {/* photos: full bleed to the right edge, square corners */}
      <div className="relative h-[38svh] min-h-[260px] overflow-hidden md:order-2 md:h-auto">
        <motion.div style={reduced ? undefined : { y: photoY }} className="absolute inset-0 -top-[8%]">
          <AnimatePresence initial={false}>
            <motion.img
              key={slides[i]}
              src={slides[i]}
              alt=""
              aria-hidden
              initial={reduced ? false : { opacity: 0, scale: 1.12 }}
              animate={{ opacity: 1, scale: 1.02 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1.4, ease: "easeInOut" }, scale: { duration: (HOLD + 1600) / 1000, ease: "linear" } }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
        </motion.div>
        {!reduced && (
          <motion.div
            aria-hidden
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}
            className="absolute inset-0 origin-right bg-accent"
          />
        )}
      </div>

      {/* copy column, left edge locked to the header logo */}
      <div className="flex flex-col px-4 pb-28 pt-8 sm:px-8 md:pb-10 md:pl-[max(2rem,calc((100vw_-_1400px)/2_+_2rem))] md:pr-12 md:pt-12 lg:pr-16">
        <div className="my-auto">
          <motion.p {...rise(0.1)} className="flex items-center gap-2.5 text-[15px] font-medium text-ink-2">
            <span className={`live-dot relative inline-block h-2 w-2 rounded-full ${open.open ? "bg-[#3ddc84] text-[#3ddc84]" : "bg-ink-3 text-ink-3"}`} />
            {allday ? t.allday : open.open ? t.open(fmtHour(open.at)) : t.closed(fmtHour(open.at))}
          </motion.p>
          <h1 className="mt-5 font-display text-[clamp(2.6rem,5.2vw,5.4rem)] leading-[0.96] tracking-[-0.02em] [text-wrap:balance]">
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
          <motion.p {...rise(0.45)} className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-ink-2 [text-wrap:pretty] md:text-[18px]">
            {bi(SITE.hero.proof, lang)}
          </motion.p>
          <motion.div {...rise(0.55)} className="mt-8 hidden flex-wrap gap-3 md:flex">
            <CallButton label={t.call} />
            <WaButton label={t.whatsapp} text={wa} />
            <DirectionsButton label={t.directions} />
          </motion.div>
        </div>

        {/* facts row on a hairline rule instead of floating chips */}
        <motion.div {...rise(0.7)} className="mt-10 flex items-end justify-between gap-6 border-t border-line pt-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-display text-[34px] leading-none tabular-nums text-ink">{rv.rating}</span>
              <Stars n={5} size={15} />
            </div>
            <p className="mt-1.5 text-[14px] text-ink-2">{total} Google reviews</p>
          </div>
          {slides.length > 1 && (
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-medium tabular-nums text-ink-2">
                {pad(i + 1)} / {pad(slides.length)}
              </span>
              <div className="flex gap-1">
                {slides.map((s, n) => (
                  <button key={s} onClick={() => setI(n)} aria-label={`Photo ${n + 1}`} className="group py-2">
                    <span className="relative block h-[2px] w-7 overflow-hidden bg-line">
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
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
