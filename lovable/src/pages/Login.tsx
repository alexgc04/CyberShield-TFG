import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Terminal, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CanvasBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Resize handler
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Mouse coordinates
    const mouse = { x: -1000, y: -1000, radius: 120 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // --- Particle System (Constellation) ---
    const particleCount = 65;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
      });
    }

    // --- Matrix Rain System ---
    const fontSize = 12;
    const columns = Math.floor(width / fontSize) + 1;
    const drops = new Array(columns).fill(0).map(() => Math.random() * -100);
    const matrixChars = "010101ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$*&%".split("");

    // Animation Loop
    const draw = () => {
      // 1. Semi-transparent black background to create trail effect
      ctx.fillStyle = "rgba(10, 10, 10, 0.15)";
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Matrix Rain (Sutíl, 5% opacity)
      ctx.fillStyle = "rgba(0, 255, 65, 0.04)";
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillText(text, x, y);

        // Reset or move drop down slowly
        if (y > height && Math.random() > 0.985) {
          drops[i] = 0;
        } else {
          drops[i] += 0.35; // Slow rain speed
        }
      }

      // 3. Draw Particles (Constellation, 120 100% 50% = #00ff41)
      ctx.fillStyle = "rgba(0, 255, 65, 0.35)";
      ctx.strokeStyle = "rgba(0, 255, 65, 0.06)";
      ctx.lineWidth = 0.8;

      particles.forEach((p, idx) => {
        // Move particle
        p.x += p.vx;
        p.y += p.vy;

        // Bounce on boundaries
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Mouse interaction (repel)
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          const forceX = (dx / dist) * force * 1.5;
          const forceY = (dy / dist) * force * 1.5;
          p.x += forceX;
          p.y += forceY;
        }

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Connect particles
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const distx = p.x - p2.x;
          const disty = p.y - p2.y;
          const distance = Math.sqrt(distx * distx + disty * disty);

          if (distance < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 bg-[#0a0a0a] pointer-events-none" />;
};

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [btnCoords, setBtnCoords] = useState({ x: 0, y: 0 });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/auth/google/available', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setGoogleAvailable(d.available))
      .catch(() => setGoogleAvailable(false));
  }, []);

  const handleButtonMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setBtnCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const trimmedIdentifier = identifier.trim().toLowerCase();
      const trimmedPassword   = password.trim();

      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: trimmedIdentifier, password: trimmedPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Error al iniciar sesión.");
        setLoading(false);
        return;
      }

      toast({
        title: "Acceso concedido",
        description: `Bienvenido, ${data.user.username}`,
      });
      navigate("/dashboard");
    } catch {
      setError("No se pudo conectar con el servidor de autenticación.");
      setLoading(false);
    }
  };

  // Detectar si el error es sobre verificación de email
  const isVerifyError = error.toLowerCase().includes('verificar') || error.toLowerCase().includes('email');

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden select-none bg-[#0a0a0a]">
      {/* Dynamic Constellation and Matrix Backdrop */}
      <CanvasBackground />
      <div className="absolute inset-0 scanline pointer-events-none z-10" />
      <div className="absolute w-full h-px bg-primary/30 animate-scan-line z-0" />

      {/* Cyberpunk card container with animated rotating border glow */}
      <Card className="w-full max-w-md mx-4 border-2 bg-black/80 backdrop-blur-xl glow-green relative z-20 animate-border-glow-rotate">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full border-2 border-primary/50 glow-green-strong">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-wider text-primary text-glow-green font-mono">
            CYBERSHIELD PRO
          </CardTitle>
          <CardDescription className="text-muted-foreground font-mono text-xs">
            <span className="text-primary/70">$</span> Iniciar sesión en el sistema
            <span className="animate-terminal-blink text-primary">_</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4 font-mono">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                Usuario o Email
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder="admin"
                value={identifier}
                onChange={(e) => { setError(''); setIdentifier(e.target.value); }}
                required
                className="bg-background/50 border-primary/30 focus:border-primary focus:glow-green font-mono text-sm placeholder:text-[#00ff41]/30 text-[#00ff41]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                  Contraseña
                </Label>
                <Link to="/forgot-password" className="text-xs font-mono text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => { setError(''); setPassword(e.target.value); }}
                  required
                  className="bg-background/50 border-primary/30 focus:border-primary font-mono text-sm pr-10 text-[#00ff41]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className={`${isVerifyError ? 'bg-orange-500/10 border-orange-500/30' : 'bg-destructive/10 border-destructive/30'} border rounded-md px-3 py-2 space-y-2`}>
                <p className={`text-xs font-mono ${isVerifyError ? 'text-orange-400' : 'text-destructive'}`}>{error}</p>
                {isVerifyError && (
                  <p className="text-xs text-muted-foreground font-mono">
                    ¿No recibiste el correo? Contacta al administrador.
                  </p>
                )}
              </div>
            )}

            {/* Ripple-expansion customized Button */}
            <Button
              type="submit"
              disabled={loading}
              onMouseMove={handleButtonMouseMove}
              style={{
                ["--x" as any]: `${btnCoords.x}px`,
                ["--y" as any]: `${btnCoords.y}px`
              }}
              className="w-full bg-[#00ff41] text-black hover:bg-[#00ff41]/80 glow-green font-mono uppercase tracking-widest text-xs h-11 relative overflow-hidden transition-all duration-300 before:content-[''] before:absolute before:top-[var(--y)] before:left-[var(--x)] before:w-0 before:h-0 before:bg-white/25 before:rounded-full before:transform before:-translate-x-1/2 before:-translate-y-1/2 hover:before:w-80 hover:before:h-80 before:transition-all before:duration-700"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 animate-pulse" />
                  ACCEDIENDO...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  ACCEDER AL SISTEMA
                </span>
              )}
            </Button>
          </form>

          {googleAvailable && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card/85 px-2 text-muted-foreground font-mono">o continúa con</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full font-mono text-sm border-primary/30 hover:border-primary hover:text-primary"
                onClick={() => { window.location.href = '/api/auth/google'; }}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                CONTINUAR CON GOOGLE
              </Button>
            </>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/register"
              className="text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              ¿No tienes cuenta? Regístrate
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground/50 font-mono">
              v2.4.1 // Sistema de Hacking Ético
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
