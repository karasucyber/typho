import { TyphoWordmark } from "./typho-wordmark";

export function HeroSection() {
  return (
    <section id="inicio" className="identity-page" aria-label="Typho AI Systems">
      <h1 className="sr-only">Typho</h1>
      <div className="logo-composition">
        <div className="scene" aria-hidden="true" />
        <div className="brand-lockup">
          <TyphoWordmark />
          <p>AI SYSTEMS <span aria-hidden="true">&middot;</span> BRASIL</p>
        </div>
      </div>
      <a className="scroll-link" href="#possibilidades">Explorar ideias</a>
    </section>
  );
}
