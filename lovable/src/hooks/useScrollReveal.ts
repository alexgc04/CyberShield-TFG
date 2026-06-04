import { useEffect, useRef, useCallback } from "react";

export function useScrollReveal() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            // Counter animation
            if (entry.target.hasAttribute("data-counter")) {
              animateCounter(entry.target as HTMLElement);
            }
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );

    const els = document.querySelectorAll(".landing-reveal, .landing-stagger, [data-counter]");
    els.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);
}

function animateCounter(el: HTMLElement) {
  const target = parseInt(el.dataset.counter || "0");
  const suffix = el.dataset.suffix || "";
  const duration = 2000;
  const start = performance.now();
  function update(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

export function useParallax(ref: React.RefObject<HTMLElement | null>, speed = 0.3) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ticking = false;
    const handler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          el.style.transform = `scale(1.1) translateY(${y * speed}px)`;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [ref, speed]);
}

export function useTypingEffect(ref: React.RefObject<HTMLElement | null>, text: string, delay = 800) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = "";
    let i = 0;
    const timer = setTimeout(function type() {
      if (!el) return;
      if (i < text.length) {
        el.textContent += text[i];
        i++;
        setTimeout(type, 45 + Math.random() * 25);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [ref, text, delay]);
}
