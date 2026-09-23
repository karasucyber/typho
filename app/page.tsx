import { ParticleStage } from "@/components/particle-stage";
import { Reveal } from "@/components/reveal";
import { HeroSection } from "@/components/hero-section";

const directions = [
  {
    number: "01",
    title: "Agentes inteligentes",
    description: "Experiências que acompanham o contexto e ajudam pessoas a avançar.",
  },
  {
    number: "02",
    title: "Automação",
    description: "Fluxos mais simples para deixar espaço ao que precisa de atenção humana.",
  },
  {
    number: "03",
    title: "Dados aplicados",
    description: "Informação organizada para encontrar padrões e orientar escolhas.",
  },
];

const steps = [
  {
    number: "01",
    title: "Entender",
    description: "Começar pelo problema, pelas pessoas e pelo contexto.",
  },
  {
    number: "02",
    title: "Construir",
    description: "Transformar uma hipótese em algo que pode ser experimentado.",
  },
  {
    number: "03",
    title: "Evoluir",
    description: "Aprender com o uso e abrir caminho para a próxima versão.",
  },
];

export default function Home() {
  return (
    <main>
      <div className="particle-layer" role="img" aria-label="Partículas da aranha se transformam em uma teia ao rolar a página">
        <ParticleStage />
      </div>
      <HeroSection />

      <section id="possibilidades" className="content-section content-section--intro">
        <div className="section-inner intro-grid">
          <Reveal className="intro-copy-block">
            <p className="section-label">01 / Possibilidades</p>
            <h2>Ideias ganham forma quando tecnologia encontra propósito.</h2>
            <p>Inteligência artificial pode aproximar pessoas, informações e decisões. O ponto de partida é descobrir onde ela faz diferença de verdade.</p>
            <a className="section-link" href="#frentes">Ver frentes de atuação</a>
          </Reveal>
          <div className="web-space" aria-hidden="true" />
        </div>
      </section>

      <section id="frentes" className="content-section content-section--directions">
        <div className="section-inner">
          <Reveal className="section-heading">
            <p className="section-label">02 / Frentes</p>
            <h2>Três caminhos para explorar.</h2>
          </Reveal>
          <div className="directions-grid">
            {directions.map((direction, index) => (
              <Reveal as="article" className="direction-card glass-card" delay={index * 0.09} key={direction.number}>
                <span className="item-number">{direction.number}</span>
                <h3>{direction.title}</h3>
                <p>{direction.description}</p>
              </Reveal>
            ))}
          </div>
          <a className="section-link" href="#abordagem">Nossa abordagem</a>
        </div>
      </section>

      <section id="abordagem" className="content-section content-section--approach">
        <div className="section-inner approach-grid">
          <Reveal className="section-heading">
            <p className="section-label">03 / Abordagem</p>
            <h2>Do primeiro sinal à próxima versão.</h2>
          </Reveal>
          <div className="steps-list">
            {steps.map((step, index) => (
              <Reveal as="article" className="step-row glass-card" delay={index * 0.09} key={step.number}>
                <span className="item-number">{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="section-inner footer-inner">
          <div>
            <strong>TYPHO</strong>
            <p>AI SYSTEMS · BRASIL</p>
          </div>
          <a href="#inicio">Voltar ao topo</a>
        </div>
      </footer>
    </main>
  );
}
