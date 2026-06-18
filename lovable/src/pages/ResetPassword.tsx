import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Terminal, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const passwordLongEnough = !password || password.length >= 8;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!token) {
      setError("Token inválido o no proporcionado en la URL.");
      setLoading(false);
      return;
    }

    if (!passwordsMatch || !passwordLongEnough) {
      setError("Verifica que las contraseñas coincidan y tengan 8 caracteres mínimo.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "No se pudo restablecer la contraseña.");
        setLoading(false);
        return;
      }

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente.",
      });
      navigate("/login");
    } catch {
      setError("No se pudo conectar con el servidor.");
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md border-destructive/20 bg-card/80 p-6 text-center">
          <h2 className="text-destructive font-mono mb-4 text-lg">ENLACE INVÁLIDO</h2>
          <p className="text-muted-foreground font-mono text-sm mb-6">No se encontró el token de seguridad en la URL.</p>
          <Button asChild variant="outline" className="font-mono w-full">
            <Link to="/forgot-password">SOLICITAR NUEVO ENLACE</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20 bg-fixed scale-110 animate-slow-push-in"
        style={{ backgroundImage: "url('/images/hacker.png')" }}
      />
      <div className="absolute inset-0 scanline pointer-events-none z-10" />

      <Card className="w-full max-w-md relative z-20 border-primary/20 bg-card/80 backdrop-blur-sm shadow-2xl">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 glow-green">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center font-mono uppercase tracking-wider text-primary">
            NUEVA CONTRASEÑA
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground font-mono">
            Introduce y confirma tu nueva contraseña.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wider">
                  Nueva Contraseña
                </Label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Terminal className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`pl-10 pr-10 bg-background/50 border-primary/30 focus:border-primary font-mono text-sm ${password && !passwordLongEnough ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && !passwordLongEnough && (
                <p className="text-xs text-destructive font-mono">Mínimo 8 caracteres</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-mono text-xs uppercase tracking-wider">
                Confirmar Contraseña
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Terminal className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`pl-10 pr-10 bg-background/50 border-primary/30 focus:border-primary font-mono text-sm ${confirmPassword && !passwordsMatch ? "border-destructive" : ""}`}
                />
              </div>
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
              disabled={loading || !passwordsMatch || !passwordLongEnough}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/80 glow-green font-mono uppercase tracking-widest text-sm h-11"
            >
              {loading ? "ACTUALIZANDO..." : "CAMBIAR CONTRASEÑA"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
