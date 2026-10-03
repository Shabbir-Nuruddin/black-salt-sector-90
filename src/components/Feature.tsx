import { AnimatePresence, motion } from "motion/react";
import { MapPin, Moon, Sun } from "@phosphor-icons/react";
import { useState } from "react";
import { SITE } from "../content";
import { UI, bi, km, type Lang } from "../lib";
import { EASE, Heading, Quote, Rise } from "./ui";

type P = { lang: Lang; reduced: boolean; index: string };
const WRAP = "relative mx-auto max-w-[1280px] px-4 sm:px-8";

export function Feature({ lang, reduced, index }: P) {
  const f = SITE.feature;
  const t = UI[lang];
  const src = t.googleReview;

  switch (f.kind) {
    /* photo on one side, a list of labelled review lines on the other */
    case "occasions":
    case "counter":
    case "thali":
      return (
        <section className="relative overflow-hidden bg-bg-2 py-20 lg:py-32">
          <div className={`${WRAP} grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16`}>
            <Rise reduced={reduced} className={`relative ${f.kind === "counter" ? "lg:order-2" : ""}`}>
              <div className="overflow-hidden rounded-2xl border border-line">
                <motion.img
                  src={f.img}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover sm:aspect-[4/3] lg:aspect-[4/5]"
                  initial={reduced ? false : { scale: 1.12 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, ease: EASE }}
                />
              </div>
            </Rise>
            <div>
              <Heading index={index} title={bi(f.title, lang)} body={bi(f.body, lang)} reduced={reduced} />
              <ol className={`mt-10 ${f.kind === "thali" ? "grid gap-x-8 sm:grid-cols-2" : ""}`}>
                {f.items.map((it, i) => (
                  <Rise key={it.label.en} reduced={reduced} delay={i * 0.06}>
                    <li className="border-t border-line py-4">
                      <p className="flex items-baseline gap-3">
                        {f.kind !== "thali" && <span className="text-[13px] tabular-nums text-accent">{String(i + 1).padStart(2, "0")}</span>}
                        <span className="font-display text-[22px] leading-tight">{bi(it.label, lang)}</span>
                      </p>
                      <p className={`mt-1.5 text-[15px] leading-snug text-ink-2 ${f.kind !== "thali" ? "pl-8" : ""}`}>“{it.quote}”</p>
                    </li>
                  </Rise>
                ))}
              </ol>
            </div>
          </div>
        </section>
      );

    case "hosts":
      return (
        <section className="relative bg-bg-2 py-20 lg:py-32">
          <div className={`${WRAP} grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16`}>
            <div>
              <Heading index={index} title={bi(f.title, lang)} body={bi(f.body, lang)} reduced={reduced} />
              {f.img && (
                <Rise reduced={reduced} className="mt-10 overflow-hidden rounded-2xl border border-line">
                  <img src={f.img} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                </Rise>
              )}
            </div>
            <div className="space-y-4 lg:pt-24">
              {f.hosts.map((h, i) => (
                <Rise key={i} reduced={reduced} delay={i * 0.08}>
                  <figure className="rounded-2xl border border-line bg-panel p-6">
                    <p className="font-display text-[15px] tracking-[0.08em] text-accent">{h.name}</p>
                    <blockquote className="mt-3 text-[clamp(1.15rem,2vw,1.4rem)] leading-snug text-ink">“{h.quote}”</blockquote>
                    <figcaption className="mt-3 text-[13px] text-ink-3">{src}</figcaption>
                  </figure>
                </Rise>
              ))}
            </div>
          </div>
        </section>
      );

    case "daynight":
      return <DayNight lang={lang} reduced={reduced} index={index} />;

    case "stopover": {
      const here = { lat: SITE.lat, lon: SITE.lon };
      const places = f.places.map((p) => ({ ...p, d: km(here, p) })).sort((a, b) => a.d - b.d);
      const max = Math.max(...places.map((p) => p.d));
      return (
        <section className="relative bg-bg-2 py-20 lg:py-32">
          <div className={`${WRAP} grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16`}>
            <div>
              <Heading index={index} title={bi(f.title, lang)} body={bi(f.body, lang)} reduced={reduced} />
              <Quote text={f.quote} source={src} className="mt-10 max-w-[460px]" />
            </div>
            {/* distance rail: the restaurant is the origin, nearby places sit at their straight-line distance */}
            <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
              <p className="flex items-center gap-2 font-display text-[18px]">
                <MapPin size={20} weight="fill" className="text-accent" />
                {SITE.name}
              </p>
              <ul className="mt-6 space-y-5">
                {places.map((p, i) => (
                  <li key={p.label.en}>
                    <div className="flex items-baseline justify-between gap-4 text-[15px]">
                      <span className="text-ink">{bi(p.label, lang)}</span>
                      <span className="tabular-nums text-ink-2">≈ {t.kmAway(p.d < 1 ? p.d.toFixed(1) : p.d.toFixed(1))}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-2">
                      <motion.div
                        className="h-full rounded-full bg-accent"
                        initial={reduced ? false : { width: 0 }}
                        whileInView={{ width: `${Math.max(6, (p.d / max) * 100)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.1, ease: EASE, delay: i * 0.1 }}
                        style={reduced ? { width: `${Math.max(6, (p.d / max) * 100)}%` } : undefined}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[12px] text-ink-3">{lang === "en" ? "Straight-line distance" : "सीधी दूरी"}</p>
            </div>
          </div>
        </section>
      );
    }
  }
}

function DayNight({ lang, reduced, index }: P) {
  const f = SITE.feature;
  const [night, setNight] = useState(true);
  if (f.kind !== "daynight") return null;
  const side = night ? f.night : f.day;
  const t = UI[lang];
  return (
    <section className="relative overflow-hidden bg-bg-2 py-20 lg:py-32">
      <div className={WRAP}>
        <div className="flex flex-wrap items-end justify-between gap-8">
          <Heading index={index} title={bi(f.title, lang)} body={bi(f.body, lang)} reduced={reduced} />
          <div role="tablist" className="inline-flex rounded-full border border-line bg-bg p-1">
            {[
              { k: false, label: f.day.label, Icon: Sun },
              { k: true, label: f.night.label, Icon: Moon },
            ].map(({ k, label, Icon }) => (
              <button
                key={String(k)}
                role="tab"
                aria-selected={night === k}
                onClick={() => setNight(k)}
                className={`relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold transition-colors ${night === k ? "text-on-accent" : "text-ink-2 hover:text-ink"}`}
              >
                {night === k && <motion.span layoutId="dn" className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <Icon size={17} weight="fill" className="relative" />
                <span className="relative">{bi(label, lang)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div className="relative overflow-hidden rounded-2xl border border-line">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img
                key={side.img}
                src={side.img}
                alt=""
                className="aspect-[16/11] w-full object-cover"
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: EASE }}
              />
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`${night}-${lang}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease: EASE }}>
              <p className="text-[18px] leading-relaxed text-ink-2">{bi(side.body, lang)}</p>
              <Quote text={side.quote} source={t.googleReview} className="mt-6" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
