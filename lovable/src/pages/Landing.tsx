import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Github, ChevronDown, Network, ShieldCheck, Crosshair, Code2, Wifi, Zap, Activity, Lock, Globe, Server, Terminal } from "lucide-react";
import { useScrollReveal, useParallax, useTypingEffect } from "@/hooks/useScrollReveal";

const GITHUB_URL = "https://github.com/alexgc04/CyberShield-TFG";

/* ── Particles ── */
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      {Array.from({ length: 25 }).map((_, i) => (
        <div key={i} className="absolute rounded-full bg-primary opacity-0"
          style={{
            width: 1 + Math.random() * 2 + "px", height: 1 + Math.random() * 2 + "px",
            left: Math.random() * 100 + "%",
            animation: `landing-drift ${8 + Math.random() * 12}s linear ${Math.random() * 10}s infinite`,
          }} />
      ))}
    </div>
  );
}

/* ── Nav ── */
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 transition-all duration-400 ${scrolled ? "bg-background/85 backdrop-blur-xl border-b border-primary/10 py-3" : ""}`}>
      <a href="#hero" className="flex items-center gap-3 no-underline">
        <div className="w-9 h-9 rounded-lg border-2 border-primary/50 flex items-center justify-center glow-green">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <span className="font-mono font-bold text-primary tracking-[3px] text-glow-green text-sm">CYBERSHIELD</span>
      </a>
      <div className="hidden md:flex items-center gap-8">
        {["about", "offensive", "defensive", "architecture"].map((s) => (
          <a key={s} href={`#${s}`} className="text-muted-foreground hover:text-primary transition-colors font-mono text-xs tracking-wider uppercase no-underline">{s === "about" ? "About" : s === "offensive" ? "Ofensivo" : s === "defensive" ? "Defensivo" : "Arquitectura"}</a>
        ))}
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 border border-primary rounded-md text-primary font-mono text-xs tracking-wider no-underline hover:bg-primary hover:text-primary-foreground transition-all hover:shadow-[0_0_20px_hsl(120_100%_50%/0.4)]">
          <Github className="w-4 h-4" /> GitHub
        </a>
      </div>
    </nav>
  );
}

/* ── Section Wrapper ── */
function Section({ id, bgImage, children, className = "" }: { id: string; bgImage?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`relative py-24 md:py-32 px-6 overflow-hidden ${className}`}>
      {bgImage && (
        <>
          <div className={`absolute inset-0 bg-cover bg-center bg-fixed opacity-40 scale-105 ${className.includes('animate-') ? className.split(' ').find(c => c.startsWith('animate-')) : ''}`} style={{ backgroundImage: `url(${bgImage})` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/85 to-background" />
        </>
      )}
      <div className="max-w-[1200px] mx-auto relative z-10">{children}</div>
    </section>
  );
}

/* ── Main Landing ── */
export default function Landing() {
  const heroBgRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<HTMLSpanElement>(null);
  useScrollReveal();
  useParallax(heroBgRef);
  useTypingEffect(typingRef, "Plataforma integral de ciberseguridad ofensiva y defensiva potenciada por inteligencia artificial y agentes autónomos.");

  return (
    <div className="bg-background text-foreground overflow-x-hidden">
      <LandingNav />

      {/* ═══ HERO ═══ */}
      <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
        <div ref={heroBgRef} className="absolute inset-0 bg-cover bg-center scale-110 animate-slow-push-in opacity-50" style={{ backgroundImage: "url(/images/img3.jpg)" }} />
        <div className="absolute inset-0 bg-primary/5 animate-fog-drift pointer-events-none blur-3xl mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background/95" />
        <div className="absolute inset-0 scanline pointer-events-none z-[2]" />
        <Particles />
        <div className="relative z-10 text-center max-w-[900px] px-6">
          <div className="landing-reveal inline-block px-4 py-1.5 border border-primary/30 rounded-full font-mono text-xs text-primary tracking-[2px] uppercase mb-6 bg-primary/5">
            ⚡ Trabajo de Fin de Grado — 2026
          </div>
          <h1 className="landing-reveal text-[clamp(2.5rem,6vw,5rem)] font-black leading-[1.05] mb-4 bg-gradient-to-br from-white via-primary to-secondary bg-clip-text text-transparent">
            CyberShield<br />Pro
          </h1>
          <p className="landing-reveal text-[clamp(1rem,2vw,1.2rem)] text-muted-foreground max-w-[600px] mx-auto mb-8 font-light">
            <span ref={typingRef}></span><span className="animate-typing-cursor"></span>
          </p>
          <Link to="/login" className="landing-reveal inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-mono font-bold text-sm tracking-[2px] uppercase rounded-lg no-underline shadow-[0_0_30px_hsl(120_100%_50%/0.3)] hover:translate-y-[-2px] hover:shadow-[0_0_50px_hsl(120_100%_50%/0.5)] transition-all">
            Acceder al sistema →
          </Link>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-muted-foreground font-mono text-[0.65rem] tracking-[2px] uppercase animate-landing-float">
          <span>Scroll</span>
          <ChevronDown className="w-5 h-5 text-primary" />
        </div>
      </section>

      {/* ═══ ABOUT + STATS ═══ */}
      <Section id="about">
        <div className="landing-reveal">
          <span className="font-mono text-xs text-primary tracking-[4px] uppercase">// Sobre el proyecto</span>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold mt-2 mb-3">Seguridad Integral <span className="text-glow-green text-primary">Automatizada</span></h2>
          <p className="text-muted-foreground max-w-[600px] mb-8">CyberShield Pro unifica módulos ofensivos y defensivos bajo una misma plataforma, orquestados por agentes de IA a través de n8n. Proyecto de fin de grado que demuestra que la ciberseguridad puede ser proactiva, inteligente y accesible.</p>
        </div>
        <div className="landing-stagger grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: 22, s: "+", l: "Ataques catalogados" },
            { n: 5, s: "", l: "Firewalls monitorizados" },
            { n: 4, s: "", l: "Estándares ISO" },
            { n: 3, s: "", l: "Agentes IA" },
          ].map((stat) => (
            <div key={stat.l} className="bg-card border border-primary/10 rounded-xl p-6 text-center hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_10px_40px_hsl(120_100%_50%/0.1)] transition-all">
              <span className="font-mono text-3xl font-bold text-primary" data-counter={stat.n} data-suffix={stat.s}>0</span>
              <span className="block text-xs text-muted-foreground font-mono tracking-wider uppercase mt-2">{stat.l}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ OFFENSIVE ═══ */}
      <Section id="offensive" bgImage="/images/nodes.png">
        <div>
          <span className="font-mono text-xs text-primary tracking-[4px] uppercase">// Módulo Ofensivo</span>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold mt-2 mb-3">Ataque y <span className="text-neon-red" style={{ textShadow: "0 0 20px hsl(0 100% 50%/0.5)" }}>Penetración</span></h2>
          <p className="text-muted-foreground max-w-[600px] mb-8">Catálogo de vectores de ataque con ejecución remota via webhooks de n8n hacia Kali Linux.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Network, color: "text-neon-red", bg: "bg-neon-red/10 border-neon-red/20", badge: "CAPA 2", bc: "bg-destructive/15 text-destructive border-destructive/20", title: "Infraestructura LAN", desc: "MAC Flooding, Port Stealing, SPAN/Mirror, túneles encubiertos DNS/ICMP." },
            { icon: Wifi, color: "text-neon-cyan", bg: "bg-neon-cyan/10 border-neon-cyan/20", badge: "WIRELESS", bc: "bg-neon-yellow/15 text-neon-yellow border-neon-yellow/20", title: "Auditoría Wireless", desc: "Des-autenticación, Evil Twin, handshake WPA2, WPS Pixie Dust, PMKID." },
            { icon: Code2, color: "text-neon-purple", bg: "bg-neon-purple/10 border-neon-purple/20", badge: "SCAPY", bc: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/20", title: "Laboratorio Scapy", desc: "Crafting de paquetes, escaneo de vulns, automatización con n8n." },
          ].map((c) => (
            <div key={c.title} className="bg-card/80 backdrop-blur-md border border-white/5 rounded-xl p-6 hover:border-primary/20 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all">
              <div className={`w-12 h-12 rounded-lg ${c.bg} border flex items-center justify-center mb-3`}><c.icon className={`w-5 h-5 ${c.color}`} /></div>
              <span className={`inline-block px-2 py-0.5 rounded text-[0.6rem] font-mono tracking-wider uppercase mb-2 border ${c.bc}`}>{c.badge}</span>
              <h3 className="font-bold mb-1">{c.title}</h3>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ DEFENSIVE ═══ */}
      <Section id="defensive" bgImage="/images/shield.png">
        <div>
          <span className="font-mono text-xs text-primary tracking-[4px] uppercase">// Módulo Defensivo</span>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold mt-2 mb-3">Detección y <span className="text-glow-cyan text-neon-cyan">Protección</span></h2>
          <p className="text-muted-foreground max-w-[600px] mb-8">Monitorización en tiempo real con integración Wazuh para SIEM y detección de amenazas.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: "5 Firewalls Activos", desc: "Palo Alto, Fortinet, Check Point, Cisco y Sophos monitorizados en tiempo real." },
            { icon: Activity, title: "Monitor de Tráfico", desc: "Tráfico entrante vs bloqueado con alertas automáticas por severidad." },
            { icon: Lock, title: "Reglas de Protección", desc: "DDoS, IPS/IDS, WAF, Geo-Blocking, Rate Limiting, SSL Inspection." },
            { icon: Globe, title: "Mapa de Amenazas", desc: "Geolocalización del origen de ataques con Asia-Pacífico liderando (38%)." },
            { icon: ShieldCheck, title: "Compliance ISO", desc: "Seguimiento ISO 27001, 27002, 27005 y NIST CSF con auditorías automatizadas." },
            { icon: Terminal, title: "Wazuh SIEM", desc: "Correlación de eventos, reglas custom y respuesta automatizada a incidentes." },
          ].map((c) => (
            <div key={c.title} className="bg-card/80 backdrop-blur-md border border-white/5 rounded-xl p-6 hover:border-neon-cyan/20 hover:-translate-y-1 transition-all">
              <c.icon className="w-6 h-6 text-neon-cyan mb-3" />
              <h3 className="font-bold mb-1">{c.title}</h3>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ LIVE DEMO CTA ═══ */}
      <section className="relative py-20 px-6 overflow-hidden bg-primary/5 border-y border-primary/10">
        <div className="absolute inset-0 scanline pointer-events-none opacity-50" />
        <div className="max-w-[800px] mx-auto text-center relative z-10">
          <div className="landing-reveal">
            <Shield className="w-12 h-12 text-primary mx-auto mb-6 glow-green" />
            <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-extrabold mb-4">¿Preparado para ver el sistema en acción?</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Esta landing page es solo la presentación. CyberShield Pro es un entorno 100% funcional conectado en tiempo real a n8n, Kali Linux y Wazuh. Accede ahora al dashboard para lanzar ataques reales en el entorno de laboratorio.
            </p>
            <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-mono font-bold text-sm tracking-[2px] uppercase rounded-lg no-underline shadow-[0_0_30px_hsl(120_100%_50%/0.3)] hover:-translate-y-1 hover:shadow-[0_0_50px_hsl(120_100%_50%/0.5)] transition-all">
              <Terminal className="w-5 h-5" /> Iniciar Entorno de Pruebas
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ ARCHITECTURE ═══ */}
      <Section id="architecture" bgImage="/images/img5.jpg" className="animate-drone-pull-back">
        <div className="landing-reveal">
          <span className="font-mono text-xs text-primary tracking-[4px] uppercase">// Arquitectura</span>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold mt-2 mb-3">Flujo de <span className="text-neon-purple" style={{ textShadow: "0 0 20px hsl(270 100% 60%/0.5)" }}>Orquestación</span></h2>
          <p className="text-muted-foreground max-w-[600px] mb-8">Frontend → n8n → Agentes IA → Kali Linux → Wazuh SIEM.</p>
        </div>
        <div className="landing-stagger flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-12">
          {[
            { icon: "🖥️", name: "Frontend", sub: "React + Vite" },
            { icon: "⚡", name: "n8n", sub: "Orquestador" },
            { icon: "🤖", name: "Agentes IA", sub: "Lead · Specialist" },
            { icon: "🐉", name: "Kali Linux", sub: "SSH Tunnel" },
            { icon: "🔐", name: "Wazuh", sub: "SIEM · Logs" },
          ].flatMap((node, i, arr) => {
            const el = (
              <div key={node.name} className="bg-card border border-primary/15 rounded-xl px-5 py-4 text-center min-w-[140px] hover:border-primary hover:shadow-[0_0_20px_hsl(120_100%_50%/0.15)] hover:scale-105 transition-all">
                <div className="text-2xl mb-1">{node.icon}</div>
                <div className="font-mono text-sm font-semibold">{node.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{node.sub}</div>
              </div>
            );
            if (i < arr.length - 1) return [el, <span key={`a${i}`} className="text-primary font-mono text-xl opacity-50 hidden md:inline">→</span>];
            return [el];
          })}
        </div>
        <div className="landing-reveal">
          <h3 className="font-mono text-xs text-muted-foreground tracking-[2px] uppercase text-center mb-4">Stack Tecnológico</h3>
        </div>
        <div className="landing-stagger flex flex-wrap gap-3 justify-center">
          {["React", "TypeScript", "Vite", "TailwindCSS", "n8n", "MongoDB", "Kali Linux", "Scapy", "Wazuh", "Python", "SSH", "Docker"].map((t) => (
            <span key={t} className="px-4 py-2 bg-card border border-white/5 rounded-lg font-mono text-sm hover:border-primary hover:text-primary hover:shadow-[0_0_15px_hsl(120_100%_50%/0.15)] transition-all cursor-default">{t}</span>
          ))}
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative border-t border-primary/10 py-8 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url(/images/img2.png)" }} />
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-mono text-sm text-primary tracking-[2px]">CYBERSHIELD PRO</span>
          </div>
          <p className="font-mono text-xs text-muted-foreground text-center">Trabajo de Fin de Grado — 2026 · <span className="text-primary">Ciberseguridad con IA</span></p>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-primary rounded-md text-primary font-mono text-xs no-underline hover:bg-primary hover:text-primary-foreground transition-all">
            <Github className="w-4 h-4" /> Ver código
          </a>
        </div>
      </footer>
    </div>
  );
}
