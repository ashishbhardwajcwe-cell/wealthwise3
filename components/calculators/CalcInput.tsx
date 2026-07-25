"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Slider + number field used by every calculator page.
 *
 * Each page previously defined its own copy, all sharing one defect: the
 * number field ran `setValue(Number(e.target.value))` with no guard, so
 * clearing it produced `Number("") === 0`. Any result that divided by that
 * input then rendered "NaN%" — visible on the NRI-tax effective rate and the
 * EMI interest share.
 *
 * Here the typed text is held locally so the field can be cleared and retyped
 * freely, while the value handed to the page is always a finite number clamped
 * to [min, max]. On blur the display snaps to the committed value, so the
 * field can never be left showing something the results don't reflect.
 *
 * Callers should still guard divisions by an input: `min` may legitimately be
 * 0, and a user can type 0.
 */
export function CalcInput({
  label,
  value,
  setValue,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  const [raw, setRaw] = useState(String(value));
  const focused = useRef(false);

  // Track external changes (the slider, or a reset) — but never while the user
  // is typing, or their keystrokes would be overwritten mid-edit.
  useEffect(() => {
    if (!focused.current) setRaw(String(value));
  }, [value]);

  const clamp = (n: number) => Math.min(Math.max(n, min), max);

  return (
    <div>
      <label className="text-sm font-semibold text-[var(--color-navy)] block mb-1.5">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(clamp(Number(e.target.value)))}
        className="w-full accent-[var(--color-gold)]"
        aria-label={label}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={raw}
        onFocus={() => { focused.current = true; }}
        onChange={(e) => {
          const next = e.target.value;
          setRaw(next);
          // Empty / partial ("-", "1e") input leaves the last good value in
          // place rather than committing 0.
          const n = Number(next);
          if (next.trim() !== "" && Number.isFinite(n)) setValue(clamp(n));
        }}
        onBlur={() => {
          focused.current = false;
          setRaw(String(value)); // snap the display to what the results used
        }}
        className="w-full mt-1.5 px-3 py-2 border border-[var(--color-silver)]/40 rounded text-sm"
        aria-label={label}
      />
    </div>
  );
}
