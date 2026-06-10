import { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";

const AUTH_API = "/api/auth/me";

export default function ProtectedRoute() {
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;

    fetch(AUTH_API, { credentials: "include" })
      .then((res) => {
        if (!cancelled) setStatus(res.ok ? "ok" : "denied");
      })
      .catch(() => {
        if (!cancelled) setStatus("denied");
      });

    return () => { cancelled = true; };
  }, []);

  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm text-muted-foreground tracking-wider">VERIFICANDO SESIÓN...</span>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
