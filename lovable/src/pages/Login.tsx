import { useState } from "react";
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
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Usamos el proxy configurado en vite.config.ts
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError("Credenciales incorrectas");
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

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                <p className="text-xs text-destructive font-mono">{error}</p>
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
