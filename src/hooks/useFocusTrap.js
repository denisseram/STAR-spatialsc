import { useEffect } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * useFocusTrap - Manages focus for a dialog/drawer: moves focus inside on
 * open, traps Tab navigation within it, closes on Escape, and restores
 * focus to the previously focused element on close.
 * @param {React.RefObject} containerRef - Ref to the dialog/drawer container
 * @param {boolean} isOpen - Whether the dialog is currently open
 * @param {function} onClose - Called when Escape is pressed
 */
export default function useFocusTrap(containerRef, isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    const container = containerRef.current;

    const focusFirst = () => {
      const focusable = container?.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      } else {
        container?.focus();
      }
    };

    focusFirst();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !container) return;

      const focusable = Array.from(
        container.querySelectorAll(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, containerRef, onClose]);
}
