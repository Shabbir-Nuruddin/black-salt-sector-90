// Adapted from 21st.dev "Segmented Control" (@ddoemonn): two options, pill
// geometry, accent thumb, keeps the masked label swap and arrow-key support.
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import type { Lang } from "../lib";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "hi", label: "हिं" },
];
const SEG = "w-11 py-1.5 text-center text-[13px] font-semibold leading-[18px]";

export function LangToggle({ value, onChange, label }: { value: Lang; onChange: (l: Lang) => void; label: string }) {
  const index = OPTIONS.findIndex((o) => o.value === value);
  const reduced = useReducedMotion();
  const pos = useMotionValue(index);
  const thumbX = useTransform(pos, (v) => `${v * 100}%`);
  const maskX = useTransform(pos, (v) => `${v * -100}%`);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (reduced) return void pos.set(index);
    const c = animate(pos, index, { type: "spring", stiffness: 520, damping: 34, mass: 0.45 });
    return () => c.stop();
  }, [index, reduced, pos]);

  const go = (i: number) => {
    const o = OPTIONS[(i + OPTIONS.length) % OPTIONS.length];
    buttons.current[OPTIONS.indexOf(o)]?.focus();
    onChange(o.value);
  };

  return (
    <div role="radiogroup" aria-label={label} className="relative inline-block rounded-full border border-line bg-bg-2/80 p-[3px]">
      <div className="relative grid grid-cols-2">
        {OPTIONS.map((o) => (
          <span key={o.value} aria-hidden className={`${SEG} text-ink-2`}>
            {o.label}
          </span>
        ))}
        <motion.div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/2 overflow-hidden rounded-full bg-accent" style={{ x: thumbX }}>
          <motion.div className="absolute inset-0" style={{ x: maskX }}>
            <div className="absolute inset-y-0 left-0 grid w-[200%] grid-cols-2">
              {OPTIONS.map((o) => (
                <span key={o.value} className={`${SEG} text-on-accent`}>
                  {o.label}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
        <div className="absolute inset-0 grid grid-cols-2">
          {OPTIONS.map((o, i) => (
            <button
              key={o.value}
              ref={(n) => {
                buttons.current[i] = n;
              }}
              type="button"
              role="radio"
              aria-checked={i === index}
              aria-label={o.value === "en" ? "English" : "हिंदी"}
              tabIndex={i === index ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => {
                if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
                  e.preventDefault();
                  go(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1));
                }
              }}
              className="cursor-pointer rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
