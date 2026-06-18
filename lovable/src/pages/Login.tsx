import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Terminal, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lockedUntil, setLockedUntil] = useState("");
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/auth/google/available', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setGoogleAvailable(d.available))
      .catch(() => setGoogleAvailable(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setLockedUntil("");

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
        if (data.error && data.error.includes("bloqueada")) {
          setLockedUntil(data.error);
        } else {
          setError(data.error || "Credenciales incorrectas");
        }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Image (Hacker) */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20 bg-fixed scale-110 animate-slow-push-in"
        style={{ backgroundImage: "url('/images/hacker.png')" }}
      />
      <div className="absolute inset-0 scanline pointer-events-none z-10" />

      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="absolute w-full h-px bg-primary/30 animate-scan-line z-0" />

      <Card className="w-full max-w-md mx-4 border-primary/20 bg-card/80 backdrop-blur-xl glow-green relative z-20">
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
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                Usuario o Email
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder="admin"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="bg-background/50 border-primary/30 focus:border-primary focus:glow-green font-mono text-sm placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background/50 border-primary/30 focus:border-primary font-mono text-sm pr-10"
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

            {error && !lockedUntil && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                <p className="text-xs text-destructive font-mono">{error}</p>
              </div>
            )}
            
            {lockedUntil && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-md px-3 py-2">
                <p className="text-xs text-orange-500 font-mono">{lockedUntil}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/80 glow-green font-mono uppercase tracking-widest text-sm h-11"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 animate-pulse" />
                  AUTENTICANDO...
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
                  <span className="bg-card/80 px-2 text-muted-foreground font-mono">o continúa con</span>
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
