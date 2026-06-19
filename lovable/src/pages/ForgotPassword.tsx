import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Terminal, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "No se pudo procesar la solicitud.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setError("No se pudo conectar con el servidor. Asegúrate de que el backend está en marcha.");
      setLoading(false);
    }
  };

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
              {success ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <Mail className="w-8 h-8 text-primary" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center font-mono uppercase tracking-wider text-primary">
            {success ? "CORREO ENVIADO" : "RECUPERAR ACCESO"}
          </CardTitle>
          {!success && (
            <p className="text-center text-sm text-muted-foreground font-mono">
              Introduce tu correo para recibir un enlace de recuperación.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!success ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wider">
                  Correo Electrónico
                </Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Terminal className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@dominio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-background/50 border-primary/30 focus:border-primary font-mono text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                  <p className="text-xs text-destructive font-mono">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/80 glow-green font-mono uppercase tracking-widest text-sm h-11"
              >
                {loading ? "ENVIANDO..." : "ENVIAR ENLACE"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="bg-primary/10 border border-primary/30 rounded-md p-6 space-y-3">
                <p className="text-sm font-mono text-primary">
                  Hemos enviado un enlace de recuperación a:
                </p>
                <p className="text-sm font-mono text-white font-bold">
                  {email}
                </p>
                <p className="text-xs font-mono text-muted-foreground mt-4">
                  Revisa tu bandeja de entrada y haz clic en el botón del correo para restablecer tu contraseña.
                  Si no lo ves, revisa la carpeta de spam.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
