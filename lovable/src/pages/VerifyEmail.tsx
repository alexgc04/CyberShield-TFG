import { useEffect, useState, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert, Terminal } from "lucide-react";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setError("Token inválido o no proporcionado en la URL.");
      setLoading(false);
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "No se pudo verificar la cuenta.");
        } else {
          setSuccess(true);
        }
      } catch {
        setError("No se pudo conectar con el servidor.");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

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
            {loading ? (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 glow-green animate-pulse">
                <Terminal className="w-8 h-8 text-primary" />
              </div>
            ) : success ? (
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/30 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                <ShieldAlert className="w-8 h-8 text-destructive" />
              </div>
            )}
          </div>
          <CardTitle className={`text-2xl font-bold text-center font-mono uppercase tracking-wider ${success ? 'text-green-500' : error ? 'text-destructive' : 'text-primary'}`}>
            {loading ? "VERIFICANDO..." : success ? "CUENTA VERIFICADA" : "ERROR DE VERIFICACIÓN"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {loading && (
            <p className="text-sm text-muted-foreground font-mono">
              Validando el token de seguridad. Por favor, espera...
            </p>
          )}

          {success && (
            <>
              <p className="text-sm text-muted-foreground font-mono">
                Tu dirección de correo electrónico ha sido confirmada exitosamente. 
                Ya tienes acceso completo al sistema CyberShield.
              </p>
              <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/80 glow-green font-mono uppercase tracking-widest text-sm h-11">
                <Link to="/login">INICIAR SESIÓN</Link>
              </Button>
            </>
          )}

          {error && (
            <>
              <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-4">
                <p className="text-sm text-destructive font-mono">{error}</p>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                El enlace puede haber expirado o ya fue utilizado.
              </p>
              <Button asChild variant="outline" className="w-full font-mono text-sm border-primary/30 hover:border-primary hover:text-primary">
                <Link to="/login">VOLVER AL INICIO</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
