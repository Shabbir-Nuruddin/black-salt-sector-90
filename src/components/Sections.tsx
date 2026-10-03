import { motion } from "motion/react";
import { Clock, MapPin, Phone, Star } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { SITE } from "../content";
import { DAYS, UI, bi, fmtHour, type Lang } from "../lib";
import { CallButton, DirectionsButton, EASE, Heading, Quote, Rise, TEL, WaButton } from "./ui";

type P = { lang: Lang; reduced: boolean; index: string };
const WRAP = "relative mx-auto max-w-[1280px] px-4 sm:px-8";

/* ---------------- dishes ---------------- */

export function Dishes({ lang, reduced, index }: P) {
  const d = SITE.dishes;
  const t = UI[lang];
  const [hover, setHover] = useState(0);
  if (d.layout === "cards")
    return (
      <section className="py-20 lg:py-32">
        <div className={WRAP}>
          <Heading index={index} title={bi(d.title, lang)} body={bi(d.body, lang)} reduced={reduced} />
        </div>
        <div className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-8 lg:mx-auto lg:grid lg:max-w-[1280px] lg:grid-cols-3 lg:overflow-visible">
          {d.items.map((it, i) => (
            <Rise key={it.name.en} reduced={reduced} delay={(i % 3) * 0.07} className="w-[78vw] shrink-0 snap-start sm:w-[360px] lg:w-auto">
              <article className="group h-full overflow-hidden rounded-2xl border border-line bg-panel">
                {it.img && (
                  <div className="overflow-hidden">
                    <img src={it.img} alt={bi(it.name, lang)} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]" />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-display text-[26px] leading-tight">{bi(it.name, lang)}</h3>
                  <p className="mt-3 text-[16px] leading-snug text-ink-2">“{it.quote}”</p>
                  <p className="mt-3 text-[12px] text-ink-3">{t.googleReview}</p>
                </div>
              </article>
            </Rise>
          ))}
        </div>
      </section>
    );

  // menu list: rows with a dotted leader; on desktop the photo of the hovered row floats beside it
  const withImg = d.items.filter((x) => x.img);
  const shown = d.items[hover]?.img ?? withImg[0]?.img;
  return (
    <section className="py-20 lg:py-32">
      <div className={`${WRAP} grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16`}>
        <div>
          <Heading index={index} title={bi(d.title, lang)} body={bi(d.body, lang)} reduced={reduced} />
          <ul className="mt-12 divide-y divide-line border-y border-line">
            {d.items.map((it, i) => (
              <li key={it.name.en} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} className="group py-5 outline-none">
                <div className="flex items-baseline gap-3">
                  <span className="text-[13px] tabular-nums text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className={`font-display text-[clamp(1.5rem,3vw,2.1rem)] leading-tight transition-colors duration-300 ${hover === i ? "text-accent" : ""}`}>{bi(it.name, lang)}</h3>
                  <span className="mb-1.5 hidden flex-1 border-b border-dotted border-line sm:block" />
                </div>
                <p className="mt-2 pl-8 text-[16px] leading-snug text-ink-2">“{it.quote}”</p>
              </li>
            ))}
          </ul>
        </div>
        {shown && (
          <div className="relative hidden lg:block">
            <div className="sticky top-28 overflow-hidden rounded-2xl border border-line">
              <motion.img
                key={shown}
                src={shown}
                alt=""
                className="aspect-[4/5] w-full object-cover"
                initial={reduced ? false : { opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: EASE }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- gallery ---------------- */

export function Gallery({ lang, reduced, index }: P) {
  const g = SITE.gallery;
  const t = UI[lang];
  const strip = useRef<HTMLDivElement>(null);
  if (g.layout === "mosaic")
    return (
      <section className="py-20 lg:py-28">
        <div className={WRAP}>
          <Heading index={index} title={bi(g.title, lang)} reduced={reduced} />
          <div className="mt-12 grid auto-rows-[180px] grid-cols-2 gap-3 sm:auto-rows-[220px] lg:grid-cols-4 lg:gap-4">
            {g.photos.map((p, i) => (
              <Rise key={p.src} reduced={reduced} delay={(i % 4) * 0.05} className={p.wide ? "col-span-2 row-span-2" : ""}>
                <div className="group h-full overflow-hidden rounded-2xl border border-line">
                  <img src={p.src} alt={p.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
                </div>
              </Rise>
            ))}
          </div>
        </div>
      </section>
    );
  return (
    <section className="py-20 lg:py-28">
      <div className={`${WRAP} flex items-end justify-between gap-6`}>
        <Heading index={index} title={bi(g.title, lang)} reduced={reduced} />
        <p className="hidden shrink-0 text-[14px] text-ink-3 md:block">{t.scroll} →</p>
      </div>
      <div ref={strip} className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:px-8 lg:px-[max(2rem,calc((100vw-1280px)/2+2rem))]">
        {g.photos.map((p) => (
          <figure key={p.src} className={`shrink-0 snap-start overflow-hidden rounded-2xl border border-line ${p.wide ? "w-[86vw] sm:w-[640px]" : "w-[70vw] sm:w-[380px]"}`}>
            <img src={p.src} alt={p.alt} loading="lazy" className="h-[52vh] max-h-[520px] w-full object-cover" />
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ---------------- reviews ---------------- */

export function Reviews({ lang, reduced, index }: P) {
  const r = SITE.reviews;
  const t = UI[lang];
  const total = r.dist.reduce((a, b) => a + b, 0);
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      {r.bg && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <img src={r.bg} alt="" loading="lazy" className="h-full w-full object-cover opacity-30 blur-[2px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--bg),color-mix(in_oklab,var(--bg)_55%,transparent)_30%,color-mix(in_oklab,var(--bg)_55%,transparent)_70%,var(--bg))]" />
        </div>
      )}
      <div className={`${WRAP} grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20`}>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Heading index={index} title={bi(r.title, lang)} reduced={reduced} />
          <div className="mt-10 flex items-end gap-4">
            <span className="font-display text-[clamp(4.5rem,10vw,7rem)] leading-[0.8] tabular-nums">{r.rating.toFixed(1)}</span>
            <span className="pb-1 text-[15px] leading-tight text-ink-2">
              {t.outOf}
              <br />
              <span className="tabular-nums text-ink">{total.toLocaleString("en-IN")}</span> {t.reviews}
            </span>
          </div>
          <ul className="mt-6 space-y-2" aria-label="Google rating breakdown">
            {r.dist.map((n, i) => (
              <li key={i} className="grid grid-cols-[2.6rem_1fr_3rem] items-center gap-3 text-[14px]">
                <span className="inline-flex items-center gap-1 tabular-nums text-ink-2">
                  {5 - i} <Star size={12} weight="fill" className="text-accent" />
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-bg-2">
                  <motion.span
                    className="block h-full rounded-full bg-accent"
                    initial={reduced ? false : { width: 0 }}
                    whileInView={{ width: `${(n / total) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.1, ease: EASE, delay: i * 0.06 }}
                    style={reduced ? { width: `${(n / total) * 100}%` } : undefined}
                  />
                </span>
                <span className="text-right tabular-nums text-ink-3">{n}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="columns-1 gap-4 sm:columns-2 [&>*]:mb-4">
          {r.quotes.map((q, i) => (
            <Rise key={i} reduced={reduced} delay={(i % 2) * 0.08} className="break-inside-avoid">
              <Quote text={q.quote} stars={q.stars} source={t.googleReview} />
            </Rise>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- visit ---------------- */

export function Visit({ lang, reduced, index, now }: P & { now: Date }) {
  const v = SITE.visit;
  const t = UI[lang];
  const today = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getDay();
  // group consecutive days with identical hours, Monday first
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows: { days: number[]; h: [number, number] }[] = [];
  for (const d of order) {
    const h = SITE.hours[d];
    const last = rows[rows.length - 1];
    if (last && last.h[0] === h[0] && last.h[1] === h[1]) last.days.push(d);
    else rows.push({ days: [d], h });
  }
  const dayLabel = (ds: number[]) => (ds.length === 1 ? DAYS[lang][ds[0]] : `${DAYS[lang][ds[0]]} – ${DAYS[lang][ds[ds.length - 1]]}`);
  return (
    <section className="pb-32 pt-16 lg:pb-40 lg:pt-28">
      <div className={WRAP}>
        <Heading index={index} title={bi(v.title, lang)} reduced={reduced} />
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Rise reduced={reduced} className="overflow-hidden rounded-2xl border border-line">
            <img src={v.img} alt={v.alt} loading="lazy" className="aspect-[4/3] h-full w-full object-cover" />
          </Rise>
          <Rise reduced={reduced} delay={0.08} className="flex flex-col rounded-2xl border border-line bg-panel p-6 sm:p-8">
            <a href={TEL} className="inline-flex items-center gap-3 font-display text-[clamp(2rem,4.4vw,3.2rem)] leading-none tabular-nums hover:text-accent">
              <Phone size={28} weight="fill" className="shrink-0 text-accent" />
              {SITE.phoneDisplay}
            </a>
            <p className="mt-6 flex gap-3 text-[17px] leading-snug text-ink-2">
              <MapPin size={22} className="mt-0.5 shrink-0 text-accent" />
              {bi(v.address, lang)}
            </p>
            {v.note && <p className="mt-3 pl-[34px] text-[15px] text-ink-3">{bi(v.note, lang)}</p>}
            <div className="mt-6 flex gap-3">
              <Clock size={22} className="mt-0.5 shrink-0 text-accent" />
              <table className="w-full text-[15px]">
                <tbody>
                  {rows.map((r) => {
                    const isToday = r.days.includes(today);
                    return (
                      <tr key={r.days.join()} className={isToday ? "text-ink" : "text-ink-2"}>
                        <td className="py-1 pr-4">
                          {dayLabel(r.days)}
                          {isToday && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-on-accent">{t.today}</span>}
                        </td>
                        <td className="py-1 text-right tabular-nums">
                          {fmtHour(r.h[0])} – {fmtHour(r.h[1])}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-auto flex flex-wrap gap-3 pt-8">
              <CallButton label={t.call} />
              <WaButton label={t.whatsapp} text={bi(SITE.waHello, lang)} />
              <DirectionsButton label={t.directions} />
            </div>
          </Rise>
        </div>
        <Rise reduced={reduced} className="mt-6 overflow-hidden rounded-2xl border border-line">
          <iframe
            title={`${t.mapTitle}: ${SITE.name}`}
            src={`https://www.google.com/maps?q=${SITE.lat},${SITE.lon}&z=16&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[340px] w-full border-0 grayscale-[0.35]"
          />
        </Rise>
      </div>
    </section>
  );
}
