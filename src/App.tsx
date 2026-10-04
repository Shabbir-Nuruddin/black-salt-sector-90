import { Component, Fragment, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { SITE } from "./content";
import { UI, bi, fmtHour, openState, type Chapter, type Lang, type SectionKey } from "./lib";
import { SCENES } from "./scenes";
import { LangToggle } from "./components/LangToggle";
import { Dishes, Gallery, Reviews, Visit } from "./components/Sections";
import { Feature } from "./components/Feature";
import { Build } from "./components/Build";
import { CallButton, DirectionsButton, EASE, WaButton, waLink } from "./components/ui";

const Scene = SCENES[SITE.scene];
const STORY = SITE.story ?? [];
// the story chapters share the stretch after the hero copy has gone
const SPAN: [number, number] = [0.2, 0.96];

/** One scroll chapter beside the pour: it rises in, holds, and hands over to the next. */
function StoryChapter({ c, i, progress, lang, right }: { c: Chapter; i: number; progress: MotionValue<number>; lang: Lang; right: boolean }) {
  const w = (SPAN[1] - SPAN[0]) / STORY.length;
  const a = SPAN[0] + i * w;
  const b = a + w;
  const last = i === STORY.length - 1;
  const opacity = useTransform(progress, last ? [a, a + 0.04, 1] : [a, a + 0.04, b - 0.04, b], last ? [0, 1, 1] : [0, 1, 1, 0]);
  const y = useTransform(progress, [a, a + 0.06, b], [40, 0, -30]);
  return (
    <motion.div data-chapter style={{ opacity, y }} className={`absolute inset-x-0 bottom-0 max-w-[560px] md:max-w-[460px] md:bottom-auto md:top-1/2 md:-translate-y-1/2 ${right ? "md:left-auto md:right-0 md:text-right" : ""}`}>
      <p className="mb-4 text-[13px] font-semibold tracking-[0.2em] text-accent">
        <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span> · {bi(c.kicker, lang).toUpperCase()}
      </p>
      <h2 className="font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] tracking-[-0.02em] text-balance">{bi(c.title, lang)}</h2>
      {c.quote && (
        <p className={`mt-5 max-w-[40ch] border-l-2 border-accent pl-4 text-[18px] leading-snug text-ink-2 ${right ? "md:ml-auto md:border-l-0 md:border-r-2 md:pl-0 md:pr-4" : ""}`}>
          “{c.quote}”<span className="mt-1.5 block text-[12px] text-ink-3">{UI[lang].googleReview}</span>
        </p>
      )}
    </motion.div>
  );
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <img src={SITE.hero.fallback} alt="" className="h-full w-full object-cover opacity-45" />;
    return this.props.children;
  }
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useDevice() {
  return useMemo(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const narrow = window.innerWidth < 768;
    const lite = narrow || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    const fine = window.matchMedia("(pointer: fine)").matches;
    return { lite, fine };
  }, []);
}

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const t = UI[lang];
  const reduced = (useReducedMotion() ?? false) && !new URLSearchParams(location.search).has("motion");
  const { lite, fine } = useDevice();
  const now = useNow();
  const state = openState(SITE.hours, now);
  const stage = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start start", "end end"] });
  const story = STORY.length > 0;
  const copyOpacity = useTransform(scrollYProgress, story ? [0, 0.1, 0.17] : [0, 0.55, 0.85], [1, 1, 0]);
  const copyY = useTransform(scrollYProgress, story ? [0, 0.17] : [0, 0.85], [0, -60]);
  const cueOpacity = useTransform(scrollYProgress, [0, story ? 0.08 : 0.12], [1, 0]);
  const right = SITE.align === "right";
  const photo = SITE.hero.backdrop;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const enter = (d: number) => ({
    initial: reduced ? false : ({ opacity: 0, y: 26, filter: "blur(8px)" } as const),
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.9, ease: EASE, delay: 0.15 + d },
  });

  let n = 0;
  const idx = () => String(++n).padStart(2, "0");
  const sections: Record<SectionKey, () => ReactNode> = {
    dishes: () => <Dishes lang={lang} reduced={reduced} index={idx()} />,
    gallery: () => <Gallery lang={lang} reduced={reduced} index={idx()} />,
    feature: () => <Feature lang={lang} reduced={reduced} index={idx()} />,
    reviews: () => <Reviews lang={lang} reduced={reduced} index={idx()} />,
    visit: () => <Visit lang={lang} reduced={reduced} index={idx()} now={now} />,
    build: () => (SITE.build ? <Build lang={lang} reduced={reduced} index={idx()} /> : null),
  };
  const wa = bi(SITE.waHello, lang);

  return (
    <div className="relative">
      <header className="fixed inset-x-0 top-0 z-40">
        <p className="bg-accent px-4 py-1.5 text-center text-[13px] font-medium text-on-accent">{bi(SITE.banner, lang)}</p>
        <div className="border-b border-line bg-bg/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
            <a href="#top" className="min-w-0 leading-none">
              <span className="block truncate font-display text-[24px] leading-none text-ink">{SITE.name}</span>
              <span className="mt-1 block truncate text-[13px] text-ink-2">{bi(SITE.sub, lang)}</span>
            </a>
            <div className="flex shrink-0 items-center gap-3">
              <LangToggle value={lang} onChange={setLang} label={t.lang} />
              <span className="hidden md:contents">
                <CallButton label={t.call} className="!px-5 !py-2.5 !text-[15px]" />
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* hero: the scene stays pinned while the first scroll drives it */}
      <section id="top" ref={stage} className={`relative ${story ? (reduced ? "h-[100svh]" : "h-[440svh]") : "h-[175svh]"}`}>
        <div className="sticky top-0 h-[100dvh] overflow-hidden">
          {photo ? (
            <motion.img
              src={photo}
              alt=""
              aria-hidden
              initial={reduced ? false : { scale: 1.14, opacity: 0 }}
              animate={{ scale: 1.04, opacity: 1 }}
              transition={{ duration: 2.4, ease: EASE }}
              className="absolute inset-0 h-full w-full object-cover blur-[3px] brightness-[0.55]"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_10%,var(--bg2),var(--bg)_70%)]" />
          )}
          <div className="absolute inset-0">
            <SceneBoundary>
              <Suspense fallback={null}>
                <Scene progress={scrollYProgress} lite={lite} interactive={fine && !reduced} still={reduced} side={SITE.align} />
              </Suspense>
            </SceneBoundary>
          </div>
          <div
            className={
              photo
                ? `pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,var(--bg)_14%,color-mix(in_oklab,var(--bg)_55%,transparent)_42%,transparent_62%)] ${right ? "md:bg-[linear-gradient(to_left,color-mix(in_oklab,var(--bg)_88%,transparent)_8%,color-mix(in_oklab,var(--bg)_45%,transparent)_40%,transparent_58%)]" : "md:bg-[linear-gradient(to_right,color-mix(in_oklab,var(--bg)_88%,transparent)_8%,color-mix(in_oklab,var(--bg)_45%,transparent)_40%,transparent_58%)]"}`
                : `pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,var(--bg)_20%,transparent_60%)] ${right ? "md:bg-[linear-gradient(to_left,var(--bg)_20%,transparent_62%)]" : "md:bg-[linear-gradient(to_right,var(--bg)_20%,transparent_62%)]"}`
            }
          />
          <div className={`grain pointer-events-none absolute inset-0 mix-blend-overlay ${photo ? "opacity-40" : "opacity-70"}`} />

          <motion.div
            style={reduced ? undefined : { opacity: copyOpacity, y: copyY }}
            className={`pointer-events-none relative mx-auto flex h-full max-w-[1400px] flex-col justify-end px-4 pb-28 sm:px-8 md:justify-center md:pb-0 md:pt-24 ${right ? "md:items-end md:text-right" : ""}`}
          >
            <div className="pointer-events-auto max-w-[600px]">
              <motion.p {...enter(0)} className={`mb-5 inline-flex items-center gap-2.5 rounded-full border border-line bg-bg/75 px-3.5 py-1.5 text-[14px] text-ink-2 backdrop-blur-sm`}>
                <span className={`live-dot relative inline-block h-2 w-2 rounded-full ${state.open ? "bg-[#3ddc84] text-[#3ddc84]" : "bg-ink-3 text-ink-3"}`} />
                {state.open ? t.open(fmtHour(state.at)) : t.closed(fmtHour(state.at))}
              </motion.p>
              <h1 className="font-display text-[clamp(2.9rem,7.4vw,6.2rem)] leading-[0.92] tracking-[-0.02em] text-balance">
                <motion.span {...enter(0.08)} className="block">
                  {bi(SITE.hero.title[0], lang)}
                </motion.span>
                <motion.span {...enter(0.18)} className="block text-accent">
                  {bi(SITE.hero.title[1], lang)}
                </motion.span>
              </h1>
              <motion.p {...enter(0.3)} className={`mt-6 max-w-[44ch] text-[18px] leading-relaxed text-ink-2 ${right ? "md:ml-auto" : ""}`}>
                {bi(SITE.hero.proof, lang)}
              </motion.p>
              <motion.div {...enter(0.4)} className={`mt-8 flex flex-wrap gap-3 ${right ? "md:justify-end" : ""}`}>
                <CallButton label={t.call} />
                <WaButton label={t.whatsapp} text={wa} />
                <DirectionsButton label={t.directions} className="hidden sm:inline-flex" />
              </motion.div>
              {fine && !reduced && !photo && <p className="mt-6 hidden text-[13px] text-ink-3 md:block">{t.drag}</p>}
            </div>
          </motion.div>

          {story && !reduced && (
            <div className="pointer-events-none absolute inset-0 mx-auto max-w-[1400px] px-4 sm:px-8">
              <div className="relative h-full pb-28 md:pb-0">
                <div className="absolute inset-x-0 bottom-28 top-0 md:bottom-0">
                  {STORY.map((c, i) => (
                    <StoryChapter key={i} c={c} i={i} progress={scrollYProgress} lang={lang} right={right} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {photo && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" />}
          <motion.div style={{ opacity: cueOpacity }} className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[12px] tracking-[0.2em] text-ink-3 md:flex">
            {(SITE.pour ? t.scrollPour : t.scroll).toUpperCase()}
            <span className="block h-10 w-px overflow-hidden bg-line">
              <motion.span className="block h-1/2 w-full bg-accent" animate={reduced ? undefined : { y: ["-100%", "200%"] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
            </span>
          </motion.div>
        </div>
      </section>

      {/* dish names run past like a menu board */}
      <div className="marquee relative -mt-[1px] overflow-hidden border-y border-line bg-bg-2 py-4" aria-hidden>
        <div className="marquee-track flex w-max items-center gap-8 pr-8">
          {[...SITE.marquee, ...SITE.marquee, ...SITE.marquee, ...SITE.marquee].map((d, i) => (
            <span key={i} className="flex items-center gap-8 font-display text-[clamp(1.4rem,2.6vw,2rem)] leading-none text-ink-2">
              {d}
              <span className="h-2 w-2 rotate-45 bg-accent" />
            </span>
          ))}
        </div>
      </div>

      <main className="relative">
        {SITE.order.map((k) => (
          <Fragment key={k}>{sections[k]()}</Fragment>
        ))}
      </main>

      <footer className="border-t border-line px-4 pb-28 pt-8 text-center text-[13px] leading-relaxed text-ink-3 sm:px-8 md:pb-10">
        {lang === "en"
          ? `Concept website made for ${SITE.name} by LocalLift. Photos and reviews are from the public Google listing.`
          : `${SITE.name} के लिए LocalLift का बनाया हुआ कॉन्सेप्ट वेबसाइट। फ़ोटो और रिव्यू पब्लिक गूगल लिस्टिंग से हैं।`}
      </footer>

      <a
        href={waLink(wa)}
        target="_blank"
        rel="noreferrer"
        aria-label={t.whatsapp}
        className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-wa text-[#062a14] shadow-[0_12px_30px_-8px_rgb(37_211_102/0.55)] transition-transform hover:-translate-y-1 md:flex"
      >
        <WhatsappLogo size={28} weight="fill" />
      </a>

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1.4fr_1fr] gap-2 border-t border-line bg-bg/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        <CallButton label={t.callShort} className="whitespace-nowrap !px-4 !py-3" />
        <a href={waLink(wa)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-wa py-3 text-[16px] font-semibold text-[#062a14] active:scale-[0.98]">
          <WhatsappLogo size={20} weight="fill" />
          {t.whatsapp}
        </a>
      </div>
    </div>
  );
}
