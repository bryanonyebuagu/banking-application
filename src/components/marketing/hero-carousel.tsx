"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type HeroAction = { label: string; href: string; variant?: "primary" | "secondary" };
export type HeroSlide = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  actions: HeroAction[];
  objectPosition?: string;
};

export function HeroCarousel({ slides, label }: { slides: HeroSlide[]; label: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pointerStart = useRef<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const select = useCallback((index: number, fromUser = true) => {
    setActive((index + slides.length) % slides.length);
    if (fromUser) setPaused(true);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 6_000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, slides.length]);

  function finishSwipe(clientX: number) {
    if (pointerStart.current === null) return;
    const distance = clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(distance) < 48) return;
    select(active + (distance < 0 ? 1 : -1));
  }

  return <section
    aria-label={label}
    aria-roledescription="carousel"
    className="relative isolate min-h-[620px] touch-pan-y overflow-hidden bg-brand text-white sm:min-h-[580px] lg:min-h-[560px]"
    onFocusCapture={() => setPaused(true)}
    onPointerDown={(event) => { pointerStart.current = event.clientX; }}
    onPointerUp={(event) => finishSwipe(event.clientX)}
    onPointerCancel={() => { pointerStart.current = null; }}
  >
    <p className="sr-only" aria-live="polite">Slide {active + 1} of {slides.length}: {slides[active]?.title}</p>
    {slides.map((slide, index) => {
      const visible = index === active;
      return <article
        key={`${slide.title}-${slide.image}`}
        aria-hidden={!visible}
        aria-label={`${index + 1} of ${slides.length}`}
        aria-roledescription="slide"
        className={`absolute inset-0 ${reducedMotion ? "" : "transition-opacity duration-700 ease-out"} ${visible ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"}`}
      >
        <Image
          src={slide.image}
          alt={slide.alt}
          fill
          priority={index === 0}
          loading={index === 0 ? undefined : "lazy"}
          className="object-cover"
          style={{ objectPosition: slide.objectPosition ?? "68% center" }}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,94,184,0.16)_0%,rgba(0,94,184,0.42)_38%,#005eb8_68%)] sm:bg-[linear-gradient(90deg,#005eb8_0%,#005eb8_36%,rgba(0,94,184,0.95)_48%,rgba(0,94,184,0.38)_72%,rgba(0,94,184,0.08)_100%)]" />
        <div className="relative mx-auto flex min-h-[620px] max-w-public items-end px-4 pb-28 pt-24 sm:min-h-[580px] sm:items-center sm:px-6 sm:pb-24 sm:pt-16 lg:min-h-[560px] lg:px-8">
          <div className={`max-w-xl ${reducedMotion ? "" : "transition-transform duration-700 ease-out"} ${visible ? "translate-y-0" : "translate-y-3"}`}>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/80">{slide.eyebrow}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.08] text-white sm:text-5xl lg:text-6xl">{slide.title}</h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-white/90">{slide.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">{slide.actions.map((action) => <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              tabIndex={visible ? 0 : -1}
              className={action.variant === "secondary"
                ? "inline-flex min-h-12 items-center rounded-control border border-white px-5 py-3 font-semibold text-white hover:bg-white/10"
                : "inline-flex min-h-12 items-center rounded-control bg-white px-5 py-3 font-semibold text-brand shadow-sm hover:bg-subtle"}
            >{action.label}</Link>)}</div>
          </div>
        </div>
      </article>;
    })}
    {slides.length > 1 && <div className="absolute inset-x-0 bottom-5 z-20 mx-auto flex max-w-public items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">{slides.map((slide, index) => <button
        key={slide.title}
        type="button"
        aria-label={`Show slide ${index + 1}: ${slide.title}`}
        aria-current={index === active ? "true" : undefined}
        onClick={() => select(index)}
        className={`h-2.5 rounded-full border border-white transition-[width,background-color] ${index === active ? "w-8 bg-white" : "w-2.5 bg-white/35 hover:bg-white/70"}`}
      />)}</div>
      <div className="flex gap-2">
        <button type="button" aria-label="Previous slide" onClick={() => select(active - 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white bg-brand/70 text-2xl text-white hover:bg-brand">‹</button>
        <button type="button" aria-label="Next slide" onClick={() => select(active + 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white bg-brand/70 text-2xl text-white hover:bg-brand">›</button>
      </div>
    </div>}
  </section>;
}
