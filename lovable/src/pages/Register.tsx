import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Terminal, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const passwordLongEnough = !password || password.length >= 8;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!passwordsMatch) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    if (!passwordLongEnough) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setLoading(false);
      return;
    }

    try {
      // Usamos el proxy configurado en vite.config.ts
      const res = await fetch(`/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al registrar la cuenta.");
        setLoading(false);
        return;
      }

      toast({
        title: "Cuenta creada",
        description: "Ahora puedes iniciar sesión.",
      });
      navigate("/login");
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
            <span className="text-primary/70">$</span> Registrar nuevo usuario
            <span className="animate-terminal-blink text-primary">_</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                Nombre de usuario
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="operator01"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-background/50 border-primary/30 focus:border-primary font-mono text-sm placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email" className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                Email
              </Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="usuario@cybershield.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50 border-primary/30 focus:border-primary font-mono text-sm placeholder:text-muted-foreground/50"
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
              {password && !passwordLongEnough && (
                <p className="text-xs text-destructive font-mono">Mínimo 8 caracteres</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                Confirmar contraseña
              </Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`bg-background/50 border-primary/30 focus:border-primary font-mono text-sm ${confirmPassword && !passwordsMatch ? "border-destructive" : ""}`}
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-destructive font-mono">Las contraseñas no coinciden</p>
              )}
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                <p className="text-xs text-destructive font-mono">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (!passwordsMatch || !passwordLongEnough)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/80 glow-green font-mono uppercase tracking-widest text-sm h-11"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 animate-pulse" />
                  REGISTRANDO...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  CREAR CUENTA
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              ¿Ya tienes cuenta? Inicia sesión
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

export default Register;
