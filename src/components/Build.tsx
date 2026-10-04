import { AnimatePresence, motion } from "motion/react";
import { Check, Minus, Plus, WhatsappLogo } from "@phosphor-icons/react";
import { useState } from "react";
import { SITE } from "../content";
import { UI, bi, type Lang } from "../lib";
import { EASE, Heading, Rise, waLink } from "./ui";

/*
 * Tap-to-build: the guest picks a spot, taps dishes from the reviews, sets the
 * headcount and time, and watches a ticket fill up beside it. The ticket is the
 * WhatsApp message. No prices, nothing invented: only what the guest chose.
 */

const WRAP = "relative mx-auto max-w-[1280px] px-4 sm:px-8";
const CHIP = "rounded-full border px-4 py-2.5 text-[15px] font-medium transition duration-200 active:scale-[0.97]";

function Step({ n, label, done, children }: { n: number; label: string; done: boolean; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-6">
      <p className="mb-4 flex items-center gap-3 text-[13px] font-semibold tracking-[0.16em] text-ink-3">
        <span className={`grid h-6 w-6 place-items-center rounded-full text-[12px] transition-colors duration-300 ${done ? "bg-accent text-on-accent" : "border border-line text-ink-2"}`}>
          {done ? <Check size={13} weight="bold" /> : n}
        </span>
        {label.toUpperCase()}
      </p>
      {children}
    </div>
  );
}

export function Build({ lang, reduced, index }: { lang: Lang; reduced: boolean; index: string }) {
  const b = SITE.build!;
  const t = UI[lang];
  const [pick, setPick] = useState<number | null>(null);
  const [qty, setQty] = useState<number[]>(() => (b.items ?? []).map(() => 0));
  const [people, setPeople] = useState(2);
  const [day, setDay] = useState<number | null>(null);
  const [time, setTime] = useState<number | null>(null);

  const bump = (i: number, d: number) => setQty((q) => q.map((v, j) => (j === i ? Math.max(0, Math.min(20, v + d)) : v)));
  const chosen = (b.items ?? []).map((it, i) => ({ name: bi(it, lang), n: qty[i] })).filter((x) => x.n > 0);

  const lines: [string, string][] = [];
  if (b.pick && pick !== null) lines.push([bi(b.pick.label, lang), bi(b.pick.options[pick].name, lang)]);
  if (chosen.length) lines.push([t.items, chosen.map((x) => `${x.n}× ${x.name}`).join(", ")]);
  if (b.people) lines.push([t.people, String(people)]);
  if (b.when && (day !== null || time !== null)) lines.push([`${t.day} / ${t.time}`, [day !== null ? t.days[day] : "", time !== null ? t.times[time] : ""].filter(Boolean).join(", ")]);
  const msg = [bi(b.hello, lang), ...lines.map(([k, v]) => `• ${k}: ${v}`)].join("\n");

  const steps = [b.pick ? pick !== null : null, b.items ? chosen.length > 0 : null, b.people ? true : null, b.when ? day !== null && time !== null : null].filter((x) => x !== null) as boolean[];
  const done = steps.filter(Boolean).length;
  let n = 0;

  return (
    <section className="py-20 lg:py-32">
      <div className={WRAP}>
        <Heading index={index} title={bi(b.title, lang)} body={bi(b.body, lang)} reduced={reduced} />
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
          <div className="space-y-8">
            {b.pick && (
              <Step n={++n} label={bi(b.pick.label, lang)} done={pick !== null}>
                <div className="grid gap-3 sm:grid-cols-3">
                  {b.pick.options.map((o, i) => {
                    const on = pick === i;
                    return (
                      <motion.button
                        key={o.name.en}
                        type="button"
                        onClick={() => setPick(on ? null : i)}
                        aria-pressed={on}
                        whileTap={reduced ? undefined : { scale: 0.97 }}
                        className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-colors duration-300 ${on ? "border-accent bg-accent/10" : "border-line bg-panel hover:border-ink-3"}`}
                      >
                        <span className={`text-[12px] font-bold tracking-[0.2em] ${on ? "text-accent" : "text-ink-3"}`}>P{i + 1}</span>
                        <span className="mt-6 block font-display text-[26px] leading-[1.05]">{bi(o.name, lang)}</span>
                        {o.note && <span className="mt-2 block text-[14px] leading-snug text-ink-2">{bi(o.note, lang)}</span>}
                        <AnimatePresence>
                          {on && (
                            <motion.span
                              initial={reduced ? false : { scale: 0, rotate: -30 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 22 }}
                              className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-accent text-on-accent"
                            >
                              <Check size={15} weight="bold" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
              </Step>
            )}

            {b.items && (
              <Step n={++n} label={t.items} done={chosen.length > 0}>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {b.items.map((it, i) => (
                    <li key={it.en} className={`flex items-center justify-between gap-3 rounded-xl border py-2 pl-4 pr-2 transition-colors duration-300 ${qty[i] ? "border-accent/60 bg-accent/5" : "border-line bg-panel"}`}>
                      <button type="button" onClick={() => bump(i, 1)} className="min-w-0 flex-1 py-1.5 text-left text-[16px] leading-tight text-ink">
                        {bi(it, lang)}
                      </button>
                      <span className="flex shrink-0 items-center gap-1">
                        {qty[i] > 0 && (
                          <button type="button" aria-label={`−1 ${it.en}`} onClick={() => bump(i, -1)} className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-line">
                            <Minus size={16} weight="bold" />
                          </button>
                        )}
                        {qty[i] > 0 && (
                          <motion.span key={qty[i]} initial={reduced ? false : { y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-6 text-center text-[16px] font-semibold tabular-nums text-accent">
                            {qty[i]}
                          </motion.span>
                        )}
                        <button type="button" aria-label={`+1 ${it.en}`} onClick={() => bump(i, 1)} className="grid h-9 w-9 place-items-center rounded-full bg-accent text-on-accent active:scale-95">
                          <Plus size={16} weight="bold" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </Step>
            )}

            {b.people && (
              <Step n={++n} label={t.people} done>
                <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel p-1.5">
                  <button type="button" aria-label="−1" onClick={() => setPeople((p) => Math.max(1, p - 1))} className="grid h-11 w-11 place-items-center rounded-full text-ink-2 hover:bg-line">
                    <Minus size={18} weight="bold" />
                  </button>
                  <motion.span key={people} initial={reduced ? false : { scale: 1.35 }} animate={{ scale: 1 }} className="w-12 text-center font-display text-[30px] leading-none tabular-nums">
                    {people}
                  </motion.span>
                  <button type="button" aria-label="+1" onClick={() => setPeople((p) => Math.min(60, p + 1))} className="grid h-11 w-11 place-items-center rounded-full bg-accent text-on-accent">
                    <Plus size={18} weight="bold" />
                  </button>
                </div>
              </Step>
            )}

            {b.when && (
              <Step n={++n} label={`${t.day} · ${t.time}`} done={day !== null && time !== null}>
                <div className="flex flex-wrap gap-2">
                  {t.days.map((d, i) => (
                    <button key={d} type="button" aria-pressed={day === i} onClick={() => setDay(day === i ? null : i)} className={`${CHIP} ${day === i ? "border-accent bg-accent text-on-accent" : "border-line text-ink-2 hover:border-ink-3"}`}>
                      {d}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.times.map((d, i) => (
                    <button key={d} type="button" aria-pressed={time === i} onClick={() => setTime(time === i ? null : i)} className={`${CHIP} ${time === i ? "border-accent bg-accent text-on-accent" : "border-line text-ink-2 hover:border-ink-3"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </Step>
            )}
          </div>

          {/* the ticket: fills as the guest taps, and is exactly what gets sent */}
          <Rise reduced={reduced} className="lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-3xl border border-line bg-panel p-6 shadow-[0_30px_80px_-40px_var(--accent)]">
              <div className="flex items-center justify-between text-[12px] font-semibold tracking-[0.18em] text-ink-3">
                <span>{SITE.name.toUpperCase()}</span>
                <span className="tabular-nums text-accent">
                  {done}/{steps.length}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${(done / Math.max(1, steps.length)) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} />
              </div>
              <p className="mt-6 text-[16px] leading-snug text-ink">{bi(b.hello, lang)}</p>
              <ul className="mt-4 min-h-[96px] space-y-3 border-y border-dashed border-line py-4">
                <AnimatePresence initial={false}>
                  {lines.length === 0 && (
                    <motion.li key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[15px] text-ink-3">
                      {t.empty}
                    </motion.li>
                  )}
                  {lines.map(([k, v]) => (
                    <motion.li
                      key={k}
                      layout={!reduced}
                      initial={reduced ? false : { opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="flex gap-3 text-[15px] leading-snug"
                    >
                      <span className="w-24 shrink-0 text-ink-3">{k}</span>
                      <span className="text-ink">{v}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              <a
                href={waLink(msg)}
                target="_blank"
                rel="noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full bg-wa py-4 text-[17px] font-semibold text-[#062a14] shadow-[0_16px_36px_-14px_rgb(37_211_102/0.7)] transition hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <WhatsappLogo size={22} weight="fill" />
                {t.send}
              </a>
            </div>
          </Rise>
        </div>
      </div>
    </section>
  );
}
