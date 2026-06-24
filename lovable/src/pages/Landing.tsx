import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Shield, 
  Github, 
  ChevronDown, 
  Network, 
  ShieldCheck, 
  Crosshair, 
  Code2, 
  Wifi, 
  Zap, 
  Activity, 
  Lock, 
  Globe, 
  Server, 
  Terminal 
} from "lucide-react";
import { useScrollReveal, useParallax, useTypingEffect } from "@/hooks/useScrollReveal";

const GITHUB_URL = "https://github.com/alexgc04/CyberShield-TFG";

/* ── Partículas Flotantes ── */
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]">
      {Array.from({ length: 25 }).map((_, i) => (
        <div key={i} className="absolute rounded-full bg-primary opacity-0"
          style={{
            width: 1 + Math.random() * 2 + "px", 
            height: 1 + Math.random() * 2 + "px",
            left: Math.random() * 100 + "%",
            animation: `landing-drift ${8 + Math.random() * 12}s linear ${Math.random() * 10}s infinite`,
          }} />
      ))}
    </div>
  );
}

/* ── Barra de Navegación Profesional ── */
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-5 transition-all duration-300 ${
      scrolled 
        ? "bg-[#080808]/80 backdrop-blur-xl border-b border-white/5 py-3.5 shadow-lg shadow-black/20" 
        : "bg-transparent"
    }`}>
      <a href="#hero" className="flex items-center gap-3 no-underline group">
        <div className="w-9 h-9 rounded-lg border border-primary/30 flex items-center justify-center glow-green transition-transform group-hover:scale-105">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <span className="font-mono font-bold text-primary tracking-[3px] text-glow-green text-sm">CYBERSHIELD</span>
      </a>
      <div className="hidden md:flex items-center gap-8">
        {[
          { id: "about", label: "Proyecto" },
          { id: "offensive", label: "Ofensivo" },
          { id: "defensive", label: "Defensivo" },
          { id: "architecture", label: "Arquitectura" }
        ].map((item) => (
          <a 
            key={item.id} 
            href={`#${item.id}`} 
            onClick={(e) => handleScrollTo(e, item.id)}
            className="text-zinc-400 hover:text-primary transition-colors font-mono text-xs tracking-wider uppercase no-underline"
          >
            {item.label}
          </a>
        ))}
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 border border-primary/30 rounded-lg text-primary font-mono text-xs tracking-wider no-underline hover:bg-primary hover:text-black transition-all hover:shadow-[0_0_20px_rgba(0,255,65,0.2)]">
          <Github className="w-4 h-4" /> GitHub
        </a>
      </div>
    </nav>
  );
}

/* ── Contenedor de Secciones con Fondo en Parallax e Integración de Imagen ── */
function Section({ 
  id, 
  bgImage, 
  children, 
  className = "" 
}: { 
  id: string; 
  bgImage?: string; 
  children: React.ReactNode; 
  className?: string 
}) {
  return (
    <section id={id} className={`relative py-24 md:py-32 px-6 overflow-hidden border-t border-white/5 ${className}`}>
      {bgImage && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center bg-fixed opacity-[0.18] scale-105 pointer-events-none" 
            style={{ backgroundImage: `url(${bgImage})` }} 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080808] via-[#080808]/85 to-[#080808] pointer-events-none" />
        </>
      )}
      <div className="max-w-[1200px] mx-auto relative z-10">{children}</div>
    </section>
  );
}

/* ── Página Principal ── */
export default function Landing() {
  const heroBgRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<HTMLSpanElement>(null);
  
  useScrollReveal();
  useParallax(heroBgRef);
  useTypingEffect(typingRef, "Plataforma integral de ciberseguridad ofensiva y defensiva potenciada por inteligencia artificial y agentes autónomos.");

  return (
    <div className="bg-[#080808] text-foreground overflow-x-hidden selection:bg-primary selection:text-black">
      <div className="absolute inset-0 scanline pointer-events-none z-[15] opacity-60" />
      <LandingNav />

      {/* ═══ HERO ═══ */}
      <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
        <div ref={heroBgRef} className="absolute inset-0 bg-cover bg-center scale-110 animate-slow-push-in opacity-40" style={{ backgroundImage: "url(/images/img3.jpg)" }} />
        <div className="absolute inset-0 bg-primary/5 animate-fog-drift pointer-events-none blur-3xl mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-[#080808]/75 to-[#080808]" />
        <Particles />
        
        <div className="relative z-10 text-center max-w-[900px] px-6">
          <div className="landing-reveal inline-block px-4 py-1.5 border border-primary/20 rounded-full font-mono text-2xs text-primary tracking-[2px] uppercase mb-6 bg-primary/5">
            ⚡ Trabajo de Fin de Grado — 2026
          </div>
          <h1 className="landing-reveal text-[clamp(2.5rem,6vw,5rem)] font-black leading-[1.05] mb-5 bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-transparent uppercase tracking-wide font-mono">
            CyberShield<br />Pro
          </h1>
          <p className="landing-reveal text-sm md:text-base text-zinc-300 max-w-[620px] mx-auto mb-8 font-light leading-relaxed font-mono">
            <span ref={typingRef}></span><span className="animate-typing-cursor"></span>
          </p>
          <Link to="/login" className="landing-reveal inline-flex items-center gap-2.5 px-8 py-3.5 bg-primary text-black font-mono font-bold text-xs tracking-[2px] uppercase rounded-xl shadow-[0_0_30px_rgba(0,255,65,0.2)] hover:translate-y-[-2px] hover:shadow-[0_0_50px_rgba(0,255,65,0.45)] transition-all">
            Acceder al sistema →
          </Link>
        </div>
        
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-zinc-500 font-mono text-[0.6rem] tracking-[2px] uppercase animate-landing-float">
          <span>Desplazar</span>
          <ChevronDown className="w-4 h-4 text-primary" />
        </div>
      </section>

      {/* ═══ SOBRE EL PROYECTO ═══ */}
      <Section id="about">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-16">
          <div className="lg:col-span-7 landing-reveal">
            <span className="font-mono text-2xs text-primary tracking-[4px] uppercase block mb-2">// Sobre el proyecto</span>
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase font-mono mb-4 text-white">
              Seguridad Integral <br /><span className="text-glow-green text-primary">Automatizada</span>
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-[640px]">
              CyberShield Pro unifica la auditoría de redes ofensiva y la monitorización defensiva bajo una misma plataforma web. Orquestado dinámicamente por agentes inteligentes integrados en flujos de n8n, este Trabajo de Fin de Grado demuestra una gestión de la seguridad proactiva, inteligente y adaptable.
            </p>
          </div>
          <div className="lg:col-span-5 flex justify-end">
            <div className="w-12 h-12 rounded-xl border border-primary/20 flex items-center justify-center glow-green bg-card">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Tarjetas de Estadísticas en Cristalmorfismo */}
        <div className="landing-stagger grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: "22+", l: "Ataques catalogados" },
            { n: "5", l: "Firewalls monitorizados" },
            { n: "4", l: "Estándares ISO" },
            { n: "3", l: "Agentes IA" },
          ].map((stat) => (
            <div key={stat.l} className="bg-zinc-900/35 backdrop-blur-md border border-white/5 rounded-2xl p-6 text-center hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_10px_35px_rgba(0,255,65,0.06)] transition-all duration-300">
              <span className="font-mono text-3xl font-extrabold text-primary text-glow-green">{stat.n}</span>
              <span className="block text-2xs text-zinc-400 font-mono tracking-wider uppercase mt-2">{stat.l}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ MÓDULO OFENSIVO (Kali Linux) ═══ */}
      <Section id="offensive" bgImage="/images/nodes.png">
        <div className="mb-12">
          <span className="font-mono text-2xs text-primary tracking-[4px] uppercase block mb-2">// Módulo Ofensivo</span>
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase font-mono mb-3 text-white">
            Ataque y <span className="text-[#ff3b30] text-glow-red" style={{ textShadow: "0 0 20px rgba(255,59,48,0.3)" }}>Penetración</span>
          </h2>
          <p className="text-zinc-400 text-sm max-w-[600px]">
            Catálogo completo de vectores de ataque con ejecución remota a través de API Gateways conectados de forma directa a sistemas Kali Linux en el laboratorio.
          </p>
        </div>

        {/* Tarjetas de Ataque */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              icon: Network, 
              color: "text-[#ff3b30]", 
              border: "hover:border-[#ff3b30]/30",
              glow: "shadow-[#ff3b30]/5",
              badge: "CAPA 2", 
              badgeColor: "bg-[#ff3b30]/10 text-[#ff3b30] border-[#ff3b30]/20", 
              title: "Infraestructura LAN", 
              desc: "Inundaciones MAC (Flooding), Port Stealing, réplica SPAN/Mirror y túneles encubiertos DNS/ICMP." 
            },
            { 
              icon: Wifi, 
              color: "text-[#00c7ff]", 
              border: "hover:border-[#00c7ff]/30",
              glow: "shadow-[#00c7ff]/5",
              badge: "WIRELESS", 
              badgeColor: "bg-[#00c7ff]/10 text-[#00c7ff] border-[#00c7ff]/20", 
              title: "Auditoría Wireless", 
              desc: "Simulaciones de des-autenticación, suplantación Evil Twin, captura de handshake WPA2, Pixie Dust y PMKID." 
            },
            { 
              icon: Code2, 
              color: "text-[#af52de]", 
              border: "hover:border-[#af52de]/30",
              glow: "shadow-[#af52de]/5",
              badge: "SCAPY LAB", 
              badgeColor: "bg-[#af52de]/10 text-[#af52de] border-[#af52de]/20", 
              title: "Generación de Paquetes", 
              desc: "Construcción y crafting personalizado de paquetes, escaneo rápido de vulnerabilidades y automatización de red." 
            },
          ].map((c) => (
            <div key={c.title} className={`bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${c.glow} ${c.border}`}>
              <div className="w-11 h-11 rounded-lg bg-zinc-800/80 border border-white/5 flex items-center justify-center mb-4">
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <span className={`inline-block px-2.5 py-0.5 rounded font-mono text-[0.6rem] tracking-wider uppercase mb-3 border ${c.badgeColor}`}>{c.badge}</span>
              <h3 className="font-bold text-sm tracking-wide font-mono text-white uppercase mb-2">{c.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ MÓDULO DEFENSIVO (Wazuh SIEM) ═══ */}
      <Section id="defensive" bgImage="/images/shield.png">
        <div className="mb-12">
          <span className="font-mono text-2xs text-primary tracking-[4px] uppercase block mb-2">// Módulo Defensivo</span>
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase font-mono mb-3 text-white">
            Detección y <span className="text-[#00c7ff] text-glow-cyan">Protección</span>
          </h2>
          <p className="text-zinc-400 text-sm max-w-[600px]">
            Monitorización e ingesta de logs en tiempo real con integración de Wazuh SIEM para correlación cruzada de eventos de seguridad y detección de amenazas.
          </p>
        </div>

        {/* Mosaico de características defensivas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Server, title: "5 Firewalls Activos", desc: "Ingesta continua de logs de firewalls como Palo Alto, Fortinet, Check Point, Cisco y Sophos." },
            { icon: Activity, title: "Monitor de Tráfico", desc: "Registro en vivo de flujos de tráfico entrante y estadísticas de volumen bloqueado." },
            { icon: Lock, title: "Reglas de Protección", desc: "Detección rápida frente a DDoS, IPS/IDS, Rate Limiting y políticas WAF configurables." },
            { icon: Globe, title: "Geolocalización", desc: "Localización geográfica del origen del ataque para mapear la severidad de incidentes." },
            { icon: ShieldCheck, title: "Cumplimiento ISO / NIST", desc: "Mapeo automático de políticas frente a normativas ISO 27001, 27002, 27005 y NIST CSF." },
            { icon: Terminal, title: "Wazuh SIEM Engine", desc: "Visualización de alertas del sistema, estado de agentes y reglas de correlación personalizadas." },
          ].map((c) => (
            <div key={c.title} className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 hover:border-[#00c7ff]/30 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_10px_35px_rgba(0,199,255,0.06)]">
              <c.icon className="w-5 h-5 text-[#00c7ff] mb-4" />
              <h3 className="font-bold text-sm tracking-wide font-mono text-white uppercase mb-2">{c.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ LIVE DEMO CTA ═══ */}
      <section className="relative py-20 px-6 overflow-hidden bg-primary/[0.02] border-y border-white/5">
        <div className="absolute inset-0 scanline pointer-events-none opacity-40" />
        <div className="max-w-[800px] mx-auto text-center relative z-10">
          <div className="landing-reveal">
            <Shield className="w-12 h-12 text-primary mx-auto mb-6 glow-green" />
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase font-mono mb-4 text-white">¿Preparado para ver el sistema en acción?</h2>
            <p className="text-zinc-400 mb-8 text-sm leading-relaxed max-w-[620px] mx-auto">
              CyberShield Pro conecta en tiempo real flujos de n8n, máquinas Kali Linux y el analizador de alertas Wazuh. Accede ahora a la consola del dashboard para lanzar simulaciones y monitorizar el entorno.
            </p>
            <Link to="/login" className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-primary text-black font-mono font-bold text-xs tracking-[2px] uppercase rounded-xl shadow-[0_0_30px_rgba(0,255,65,0.2)] hover:translate-y-[-2px] hover:shadow-[0_0_50px_rgba(0,255,65,0.45)] transition-all">
              <Terminal className="w-5 h-5" /> Iniciar Consola del Laboratorio
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ ARQUITECTURA DEL PROYECTO ═══ */}
      <Section id="architecture" bgImage="/images/img5.jpg">
        <div className="mb-12">
          <span className="font-mono text-2xs text-primary tracking-[4px] uppercase block mb-2">// Arquitectura</span>
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase font-mono mb-3 text-white">
            Flujo de <span className="text-[#af52de] text-glow-purple" style={{ textShadow: "0 0 20px rgba(175,82,222,0.3)" }}>Orquestación</span>
          </h2>
          <p className="text-zinc-400 text-sm max-w-[600px]">
            Estructura de comunicación integrada: Frontend web → APIs n8n → Agentes de IA → Kali Linux remoto → Wazuh SIEM.
          </p>
        </div>

        {/* Diagrama de Flujo en Cristalmorfismo */}
        <div className="landing-stagger flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-16">
          {[
            { icon: "🖥️", name: "Frontend", sub: "React + Vite" },
            { icon: "⚡", name: "n8n Gateway", sub: "Orquestador" },
            { icon: "🤖", name: "Agentes IA", sub: "Especialistas" },
            { icon: "🐉", name: "Kali Linux", sub: "Túnel SSH" },
            { icon: "🔐", name: "Wazuh SIEM", sub: "Alertas y Logs" },
          ].flatMap((node, i, arr) => {
            const nodeEl = (
              <div key={node.name} className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-2xl px-5 py-4 text-center min-w-[155px] hover:border-primary/30 hover:scale-[1.03] transition-all duration-300">
                <div className="text-2xl mb-2">{node.icon}</div>
                <div className="font-mono text-xs font-bold text-white uppercase tracking-wide">{node.name}</div>
                <div className="text-[0.65rem] text-zinc-500 font-mono mt-1">{node.sub}</div>
              </div>
            );
            if (i < arr.length - 1) {
              return [
                nodeEl, 
                <span key={`arrow-${i}`} className="text-primary font-mono text-lg opacity-40 hidden md:inline-block mx-1">→</span>
              ];
            }
            return [nodeEl];
          })}
        </div>

        {/* Tecnologías */}
        <div className="border-t border-white/5 pt-8">
          <h3 className="font-mono text-2xs text-zinc-500 tracking-[2px] uppercase text-center mb-6">Stack de Tecnologías del TFG</h3>
          <div className="landing-stagger flex flex-wrap gap-2.5 justify-center max-w-[850px] mx-auto">
            {["React", "TypeScript", "Vite", "TailwindCSS", "n8n Workflows", "MongoDB", "Kali Linux", "Scapy Engine", "Wazuh SIEM", "Python Scripts", "SSH Tunneling", "Docker Containers"].map((t) => (
              <span key={t} className="px-3.5 py-1.5 bg-zinc-900/40 border border-white/5 rounded-lg font-mono text-2xs text-zinc-300 hover:border-primary/30 hover:text-primary transition-all duration-300 cursor-default select-none">{t}</span>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative border-t border-white/5 py-12 px-6 overflow-hidden bg-[#060606]">
        <div className="absolute inset-0 bg-cover bg-center opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url(/images/img2.png)" }} />
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg border border-primary/20 flex items-center justify-center bg-card">
              <Shield className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="font-mono text-xs text-primary tracking-[2px] font-bold">CYBERSHIELD PRO</span>
          </div>
          
          <p className="font-mono text-[0.65rem] text-zinc-500 text-center">
            Trabajo de Fin de Grado — 2026 · <span className="text-primary">Ciberseguridad Inteligente con IA</span>
          </p>
          
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-primary/20 rounded-lg text-primary font-mono text-xs no-underline hover:bg-primary hover:text-black transition-all">
            <Github className="w-4 h-4" /> Ver código
          </a>
        </div>
      </footer>
    </div>
  );
}
