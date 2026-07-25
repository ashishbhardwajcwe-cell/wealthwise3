"use client";

import { useEffect, useRef, useId, type ReactNode } from "react";

/**
 * Accessible dialog shell for the site's overlays (enquiry form, PMS brief
 * sheet, compare table).
 *
 * Those were plain divs with a click-outside handler: no dialog semantics, no
 * Escape, no focus management, and the page kept scrolling behind them. A
 * keyboard or screen-reader user could tab straight out of an open enquiry
 * form into the page underneath — on the site's main conversion path.
 *
 * This provides, once, for all of them:
 *  - role="dialog" + aria-modal, labelled by the panel's own heading
 *  - Escape to close
 *  - focus moved into the panel on open and restored to the trigger on close
 *  - a focus trap cycling Tab within the panel
 *  - body scroll lock while open
 *
 * `labelledBy` takes precedence when the caller renders its own heading with a
 * known id; otherwise pass `label` for an aria-label. Children are rendered
 * inside the panel, so existing markup moves in unchanged.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  onClose,
  children,
  label,
  labelledBy,
  align = "center",
  panelClassName,
  panelStyle,
  overlayClassName,
  overlayStyle,
  zIndex = 50,
}: {
  onClose: () => void;
  children: ReactNode;
  /** aria-label for the dialog when it has no visible heading to point at. */
  label?: string;
  /** id of the visible heading that names this dialog (preferred). */
  labelledBy?: string;
  /** center = modal, end = right-hand slide-in sheet. */
  align?: "center" | "end";
  panelClassName?: string;
  panelStyle?: React.CSSProperties;
  overlayClassName?: string;
  overlayStyle?: React.CSSProperties;
  zIndex?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const fallbackId = useId();

  useEffect(() => {
    const panel = panelRef.current;
    // Restore focus to whatever opened the dialog once it closes.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus in: first focusable control, else the panel itself.
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      // Trap Tab inside the panel.
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // Lock background scroll without shifting layout when a scrollbar vanishes.
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className={overlayClassName ?? `fixed inset-0 flex p-4 ${align === "end" ? "justify-end" : "items-center justify-center"}`}
      style={{ zIndex, background: "rgba(15,26,20,0.5)", ...overlayStyle }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        {...(labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": label ?? "Dialog" })}
        id={labelledBy ? undefined : fallbackId}
        tabIndex={-1}
        className={panelClassName}
        style={{ outline: "none", ...panelStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
