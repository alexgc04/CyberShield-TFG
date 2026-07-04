import { useRef, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Hyperspeed, { cyberShieldPreset, offensivePreset, defensivePreset } from "@/components/Hyperspeed";
import ColorBends from "@/components/ColorBends";
import Radar from "@/components/Radar";
import RippleGrid from "@/components/RippleGrid";
import Threads from "@/components/Threads";
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
  Terminal,
  ShieldAlert,
  FileText
} from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import SplitText from "@/components/SplitText";
import DecryptedText from "@/components/DecryptedText";
import SpotlightCard from "@/components/SpotlightCard";

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
    <nav className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-5 transition-all duration-300 ${scrolled
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
    <section id={id} className={`relative py-24 md:py-32 px-6 overflow-hidden ${className}`}>
      {/* Capas de fondo animadas dinámicas según ID de sección */}
      {id === "about" && (
        <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.50]">
          <ColorBends
            colors={["#00FF41", "#002205", "#00aa22", "#000000"]}
            rotation={90}
            speed={0.2}
            scale={1.2}
            frequency={1}
            warpStrength={1}
            mouseInfluence={1}
            noise={0.15}
            parallax={0.5}
            iterations={1}
            intensity={1.5}
            bandWidth={6}
            transparent
          />
        </div>
      )}
      {id === "offensive" && (
        <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.35]">
          <Radar
            speed={0.8}
            scale={0.65}
            ringCount={8}
            spokeCount={12}
            ringThickness={0.03}
            spokeThickness={0.005}
            sweepSpeed={1.0}
            sweepWidth={3.0}
            sweepLobes={1}
            color="#ff3b30"
            backgroundColor="#000000"
            falloff={1.5}
            brightness={1.0}
            enableMouseInteraction={true}
            mouseInfluence={0.08}
          />
        </div>
      )}
      {id === "defensive" && (
        <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.5]">
          <RippleGrid
            enableRainbow={false}
            gridColor="#00c7ff"
            rippleIntensity={0.06}
            gridSize={8}
            gridThickness={12}
            mouseInteraction={true}
            mouseInteractionRadius={1.0}
            opacity={0.7}
          />
        </div>
      )}
      {id === "architecture" && (
        <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.25]">
          <Threads color={[0.68, 0.32, 0.87]} amplitude={2.5} distance={0.45} enableMouseInteraction={true} />
        </div>
      )}

      {bgImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-fixed opacity-[0.08] scale-105 pointer-events-none z-0"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080808] via-[#080808]/95 to-[#080808] pointer-events-none z-0" />
        </>
      )}

      {/* Gradientes de difuminado (Fog masks) superiores e inferiores para transiciones fluídas */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#080808] to-transparent pointer-events-none z-[2]" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#080808] to-transparent pointer-events-none z-[2]" />

      <div className="max-w-[1200px] mx-auto relative z-10">{children}</div>
    </section>
  );
}

/* ── Página Principal ── */
export default function Landing() {
  useScrollReveal();

  return (
    <div className="bg-[#080808] text-foreground overflow-x-hidden selection:bg-primary selection:text-black">
      <div className="absolute inset-0 scanline pointer-events-none z-[15] opacity-60" />
      <LandingNav />

      {/* ═══ HERO ═══ */}
      <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Hyperspeed WebGL Background */}
        <div className="absolute inset-0 z-0 opacity-60">
          <Hyperspeed effectOptions={cyberShieldPreset} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#080808]/70 to-[#080808] z-[1]" />
        <Particles />

        <div className="relative z-10 text-center max-w-[900px] px-6">
          <div className="landing-reveal inline-block px-4 py-1.5 border border-primary/20 rounded-full font-mono text-2xs text-primary tracking-[2px] uppercase mb-6 bg-primary/5">
            TRABAJO DE FIN DE GRADO — 2026
          </div>
          <SplitText
            text="CYBERSHIELD PRO"
            className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-[1.05] mb-5 bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-transparent uppercase tracking-wide font-mono block"
            delay={50}
            duration={1.0}
            ease="power4.out"
            tag="h1"
          />
          <div className="landing-reveal max-w-[640px] mx-auto mb-8 min-h-[48px] flex items-center justify-center">
            <DecryptedText
              text="Validación de seguridad automatizada mediante inyección de vectores ofensivos y correlación SIEM en entornos de laboratorio."
              animateOn="view"
              speed={30}
              maxIterations={15}
              parentClassName="text-sm md:text-base text-zinc-300 font-light leading-relaxed font-mono"
              className="text-white text-glow-green font-bold"
              encryptedClassName="text-primary font-bold opacity-80"
            />
          </div>
          <Link to="/login" className="landing-reveal inline-flex items-center gap-2.5 px-8 py-3.5 bg-primary text-black font-mono font-bold text-xs tracking-[2px] uppercase rounded-xl shadow-[0_0_30px_rgba(0,255,65,0.2)] hover:translate-y-[-2px] hover:shadow-[0_0_50px_rgba(0,255,65,0.45)] transition-all">
            Acceder al sistema →
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#080808] to-transparent z-[2] pointer-events-none" />
      </section>

      {/* ═══ SOBRE EL PROYECTO ═══ */}
      <Section id="about">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-16">
          <div className="lg:col-span-7 landing-reveal from-left">
            <span className="font-mono text-2xs text-primary tracking-[4px] uppercase block mb-2">PROYECTO DE INVESTIGACIÓN</span>
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase font-mono mb-4 text-white">
              Seguridad Integral <br /><span className="text-glow-green text-primary">Automatizada</span>
            </h2>
            <p className="text-zinc-300 text-sm leading-relaxed max-w-[640px]">
              CyberShield Pro representa una arquitectura integral de validación defensiva orientada a la emulación controlada de adversarios. La solución consolida un ciclo continuo de auditoría de seguridad: desde la instanciación de vectores ofensivos multiplataforma hasta la validación y cotejo de eventos en tiempo real dentro del motor SIEM, asegurando la resiliencia tecnológica del ecosistema.
            </p>
          </div>
          <div className="lg:col-span-5 flex justify-end landing-reveal from-right">
            <div className="w-12 h-12 rounded-xl border border-primary/20 flex items-center justify-center glow-green bg-card">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Tarjetas de Estadísticas en Cristalmorfismo */}
        <div className="landing-stagger grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: "15", l: "Vectores de Ataque" },
            { n: "n8n", l: "Orquestación Activa" },
            { n: "SIEM", l: "Correlación Wazuh" },
            { n: "MITRE", l: "Mapeo de Técnicas" },
          ].map((stat) => (
            <SpotlightCard
              key={stat.l}
              spotlightColor="rgba(0, 255, 65, 0.12)"
              className="bg-zinc-900/35 backdrop-blur-md border border-white/5 rounded-2xl p-6 text-center hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_10px_35px_rgba(0,255,65,0.06)] transition-all duration-300"
            >
              <span className="font-mono text-3xl font-extrabold text-primary text-glow-green">{stat.n}</span>
              <span className="block text-2xs text-zinc-400 font-mono tracking-wider uppercase mt-2">{stat.l}</span>
            </SpotlightCard>
          ))}
        </div>
      </Section>

      {/* ═══ MÓDULO OFENSIVO (Kali Linux) ═══ */}
      <Section id="offensive" bgImage="/images/nodes.png">
        <div className="mb-12 landing-reveal from-left">
          <span className="font-mono text-2xs text-primary tracking-[4px] uppercase block mb-2">MÓDULO OFENSIVO</span>
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase font-mono mb-3 text-white">
            Ataque y <span className="text-[#ff3b30] text-glow-red" style={{ textShadow: "0 0 20px rgba(255,59,48,0.3)" }}>Penetración</span>
          </h2>
          <p className="text-zinc-300 text-sm max-w-[600px]">
            Repositorio estructurado de simulaciones ofensivas ejecutadas bajo demanda. La plataforma orquesta peticiones cifradas para desplegar exploits y herramientas de intrusión desde instancias Kali Linux aisladas.
          </p>
        </div>

        {/* Tarjetas de Ataque */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 landing-stagger">
          {[
            {
              icon: Network,
              color: "text-[#ff3b30]",
              border: "hover:border-[#ff3b30]/30",
              glow: "shadow-[#ff3b30]/5",
              badge: "Capa 2 / LAN",
              badgeColor: "bg-[#ff3b30]/10 text-[#ff3b30] border-[#ff3b30]/20",
              title: "Ataques en Red Local",
              desc: "Ejecución de vectores en la capa de enlace: inundación de tablas CAM (MAC Flooding), Switch Port Stealing, suplantación ARP dinámico (MitM) e inyección fraudulenta de pools DHCP.",
              spotlight: "rgba(255, 59, 48, 0.12)"
            },
            {
              icon: Code2,
              color: "text-[#00c7ff]",
              border: "hover:border-[#00c7ff]/30",
              glow: "shadow-[#00c7ff]/5",
              badge: "Scapy Engine",
              badgeColor: "bg-[#00c7ff]/10 text-[#00c7ff] border-[#00c7ff]/20",
              title: "Inyección de Paquetes",
              desc: "Forjado de tramas TCP/IP a bajo nivel empleando Python: escaneos sigilosos SYN/ACK sin establecimiento completo de sesión, descubrimiento pasivo y fuzzing activo de protocolos de red.",
              spotlight: "rgba(0, 199, 255, 0.12)"
            },
            {
              icon: Terminal,
              color: "text-[#af52de]",
              border: "hover:border-[#af52de]/30",
              glow: "shadow-[#af52de]/5",
              badge: "Fuerza Bruta & Privilegios",
              badgeColor: "bg-[#af52de]/10 text-[#af52de] border-[#af52de]/20",
              title: "Intrusión y Escalada",
              desc: "Validación de robustez de credenciales SSH/Web mediante emulaciones de diccionario, análisis estático de configuraciones SUID/sudo incorrectas y emulación de ataques de dominio Kerberos.",
              spotlight: "rgba(175, 82, 222, 0.12)"
            },
          ].map((c) => (
            <SpotlightCard
              key={c.title}
              spotlightColor={c.spotlight}
              className={`bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${c.glow} ${c.border}`}
            >
              <div className="w-11 h-11 rounded-lg bg-zinc-800/80 border border-white/5 flex items-center justify-center mb-4">
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <span className={`inline-block px-2.5 py-0.5 rounded font-mono text-[0.6rem] tracking-wider uppercase mb-3 border ${c.badgeColor}`}>{c.badge}</span>
              <h3 className="font-bold text-sm tracking-wide font-mono text-white uppercase mb-2">{c.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{c.desc}</p>
            </SpotlightCard>
          ))}
        </div>
      </Section>

      {/* ═══ MÓDULO DEFENSIVO (Wazuh SIEM) ═══ */}
      <Section id="defensive" bgImage="/images/shield.png">
        <div className="mb-12 landing-reveal from-right">
          <span className="font-mono text-2xs text-primary tracking-[4px] uppercase block mb-2">MÓDULO DEFENSIVO</span>
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase font-mono mb-3 text-white">
            Detección y <span className="text-[#00c7ff] text-glow-cyan">Protección</span>
          </h2>
          <p className="text-zinc-300 text-sm max-w-[600px]">
            Ingesta, agregación y correlación de eventos en tiempo real. La infraestructura defensiva utiliza agentes de seguridad locales para verificar la eficacia de los sistemas frente a técnicas adversarias de intrusión.
          </p>
        </div>

        {/* Mosaico de características defensivas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 landing-stagger">
          {[
            { icon: ShieldAlert, title: "Reglas de Correlación", desc: "Despliegue y tuning de decodificadores y firmas XML a medida para mapear la actividad ofensiva en el Manager." },
            { icon: Activity, title: "Alertas en Tiempo Real", desc: "Monitorización de logs e indexación de telemetría de red a través de la cola de logs unificada de Wazuh." },
            { icon: Lock, title: "Hardening & MITRE ATT&CK", desc: "Clasificación precisa de los vectores simulados asociándolos con las tácticas y técnicas de la matriz internacional MITRE ATT&CK." },
            { icon: Server, title: "Agentes Monitoreados", desc: "Verificación de la comunicación activa y estado de los servicios defensivos de los endpoints del laboratorio." },
            { icon: ShieldCheck, title: "Auditoría Defensiva", desc: "Validación y correlación cruzada automatizada para certificar si el SIEM registró el vector de ataque ejecutado." },
            { icon: FileText, title: "Reportes en PDF", desc: "Generación dinámica de informes técnicos de intrusión y auditorías de cumplimiento listos para presentación ejecutiva." },
          ].map((c) => (
            <SpotlightCard
              key={c.title}
              spotlightColor="rgba(0, 199, 255, 0.12)"
              className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 hover:border-[#00c7ff]/30 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_10px_35px_rgba(0,199,255,0.06)]"
            >
              <c.icon className="w-5 h-5 text-[#00c7ff] mb-4" />
              <h3 className="font-bold text-sm tracking-wide font-mono text-white uppercase mb-2">{c.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{c.desc}</p>
            </SpotlightCard>
          ))}
        </div>
      </Section>

      {/* ═══ LIVE DEMO CTA ═══ */}
      <section className="relative py-20 px-6 overflow-hidden bg-primary/[0.02] border-y border-white/5">
        <div className="absolute inset-0 z-0 opacity-[0.3] pointer-events-none">
          <RippleGrid
            enableRainbow={false}
            gridColor="#ffdd57"
            rippleIntensity={0.04}
            gridSize={12}
            gridThickness={8}
            mouseInteraction={true}
            mouseInteractionRadius={1.2}
            opacity={0.6}
          />
        </div>
        <div className="absolute inset-0 scanline pointer-events-none opacity-40 z-0" />
        <div className="max-w-[800px] mx-auto text-center relative z-10">
          <div className="landing-reveal scale-up">
            <Shield className="w-12 h-12 text-primary mx-auto mb-6 glow-green" />
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase font-mono mb-4 text-white">¿Desea iniciar la validación de la postura de seguridad?</h2>
            <p className="text-zinc-300 mb-8 text-sm leading-relaxed max-w-[620px] mx-auto">
              Interconecte flujos n8n estructurados, endpoints de control en Kali Linux y la base de monitorización en Wazuh. Ingrese a la plataforma de auditoría para lanzar vectores de ataque y verificar su detección.
            </p>
            <Link to="/login" className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-primary text-black font-mono font-bold text-xs tracking-[2px] uppercase rounded-xl shadow-[0_0_30px_rgba(0,255,65,0.2)] hover:translate-y-[-2px] hover:shadow-[0_0_50px_rgba(0,255,65,0.45)] transition-all">
              <Terminal className="w-5 h-5" /> Acceder a la Consola
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ ARQUITECTURA DEL PROYECTO ═══ */}
      <Section id="architecture" bgImage="/images/img5.jpg">
        <div className="mb-12 landing-reveal from-left">
          <span className="font-mono text-2xs text-primary tracking-[4px] uppercase block mb-2">ARQUITECTURA DEL PROYECTO</span>
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase font-mono mb-3 text-white">
            Flujo de <span className="text-[#af52de] text-glow-purple" style={{ textShadow: "0 0 20px rgba(175,82,222,0.3)" }}>Orquestación</span>
          </h2>
          <p className="text-zinc-300 text-sm max-w-[600px]">
            Esquema jerárquico y topología de comunicación cifrada. La arquitectura acopla la gestión web, flujos lógicos distribuidos y recopilación de logs centralizada.
          </p>
        </div>

        {/* Diagrama de Flujo en Cristalmorfismo */}
        <div className="landing-stagger flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-16">
          {[
            { icon: "🖥️", name: "Consola Web", sub: "React + Vite" },
            { icon: "⚡", name: "n8n Gateway", sub: "Orquestación API" },
            { icon: "🐉", name: "Kali Linux", sub: "Túnel SSH" },
            { icon: "🔐", name: "Wazuh Manager", sub: "Reglas & Syslog" },
            { icon: "📊", name: "Wazuh Indexer", sub: "Inyección de Alertas" },
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
        <div className="border-t border-white/5 pt-8 landing-reveal scale-up">
          <h3 className="font-mono text-2xs text-zinc-500 tracking-[2px] uppercase text-center mb-6">Stack de Tecnologías del TFG</h3>
          <div className="flex flex-wrap gap-2.5 justify-center max-w-[850px] mx-auto">
            {["React", "TypeScript", "Vite", "TailwindCSS", "n8n Workflows", "MongoDB", "Kali Linux", "Scapy Engine", "Wazuh SIEM", "Python Scripts", "SSH Tunneling", "Docker Containers"].map((t) => (
              <span key={t} className="px-3.5 py-1.5 bg-zinc-900/40 border border-white/5 rounded-lg font-mono text-2xs text-zinc-300 hover:border-primary/30 hover:text-primary transition-all duration-300 cursor-default select-none">{t}</span>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative border-t border-white/5 py-12 px-6 overflow-hidden bg-[#060606]">
        <div className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none">
          <Threads color={[0.0, 0.7, 0.18]} amplitude={1.5} distance={0.2} enableMouseInteraction={true} />
        </div>
        <div className="absolute inset-0 bg-cover bg-center opacity-[0.06] pointer-events-none z-0" style={{ backgroundImage: "url(/images/img2.png)" }} />
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
