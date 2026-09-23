"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const sections = [
  { id: "inicio", label: "Início" },
  { id: "possibilidades", label: "Possibilidades" },
  { id: "frentes", label: "Frentes" },
  { id: "abordagem", label: "Abordagem" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateActive = () => {
      let current = "";
      for (const { id } of sections) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= 100) current = id;
      }
      setActive(current);
    };

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnOutside);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnOutside);
    };
  }, [open]);

  return (
    <header className="site-header" ref={headerRef}>
      <div className="site-header__inner">
        <Link className="site-header__brand" href="/#inicio" aria-label="Typho, voltar ao início" onClick={() => setOpen(false)}>
          <span className="site-header__name">TYPHO</span>
          <span className="site-header__tag">AI SYSTEMS</span>
        </Link>
        <nav id="site-navigation" className="site-header__nav" aria-label="Navegação principal" data-open={open}>
          {sections.map(({ id, label }) => (
            <Link
              key={id}
              href={`/#${id}`}
              aria-current={active === id ? "location" : undefined}
              onClick={() => {
                setActive(id);
                setOpen(false);
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <button
          className="site-header__toggle"
          type="button"
          aria-controls="site-navigation"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Fechar" : "Menu"}
        </button>
      </div>
    </header>
  );
}
