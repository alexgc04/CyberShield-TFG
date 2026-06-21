import { useEffect, useState, useRef } from "react";

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [trailPosition, setTrailPosition] = useState({ x: 0, y: 0 });
  const [clicked, setClicked] = useState(false);
  const [clickWave, setClickWave] = useState({ x: 0, y: 0, active: false });
  const [isHoveringClickable, setIsHoveringClickable] = useState(false);
  const trailRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    // Add custom cursor body class to hide standard cursor
    document.documentElement.classList.add("custom-cursor-active");

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = (e: MouseEvent) => {
      setClicked(true);
      setClickWave({ x: e.clientX, y: e.clientY, active: true });
      setTimeout(() => setClickWave(prev => ({ ...prev, active: false })), 400);
    };

    const handleMouseUp = () => {
      setClicked(false);
    };

    // Track if mouse is over interactive elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const isClickable = 
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA" ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest("[role='button']") ||
        target.classList.contains("cursor-pointer") ||
        target.closest(".hover\\:scale-\\[1\\.01\\]") ||
        target.closest(".glow-green");
        
      setIsHoveringClickable(!!isClickable);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mouseover", handleMouseOver);

    // Trail easing animation (requestAnimationFrame)
    let animationId: number;
    const updateTrail = () => {
      const targetX = trailRef.current.x + (position.x - trailRef.current.x) * 0.18;
      const targetY = trailRef.current.y + (position.y - trailRef.current.y) * 0.18;
      
      trailRef.current = { x: targetX, y: targetY };
      setTrailPosition({ x: targetX, y: targetY });
      
      animationId = requestAnimationFrame(updateTrail);
    };
    
    animationId = requestAnimationFrame(updateTrail);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseover", handleMouseOver);
      cancelAnimationFrame(animationId);
    };
  }, [position.x, position.y]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none">
      {/* 1. Main green crosshair (pointer) */}
      {!isHoveringClickable ? (
        <div
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: clicked ? "translate(-50%, -50%) scale(0.8)" : "translate(-50%, -50%) scale(1)",
            transition: "transform 0.1s ease"
          }}
          className="absolute w-4 h-4"
        >
          <div className="absolute top-1/2 left-0 w-4 h-0.5 bg-[#00ff41] -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 w-0.5 h-4 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 border border-[#00ff41] rounded-full -translate-x-1/2 -translate-y-1/2 bg-black" />
        </div>
      ) : (
        /* 2. Hollow Circle Pointer over clickables */
        <div
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: "translate(-50%, -50%) scale(1)",
          }}
          className="absolute w-2 h-2 rounded-full bg-[#00ff41] shadow-[0_0_8px_#00ff41]"
        />
      )}

      {/* 3. Delayed Easing Hollow Circle Trail */}
      <div
        style={{
          left: `${trailPosition.x}px`,
          top: `${trailPosition.y}px`,
          transform: isHoveringClickable ? "translate(-50%, -50%) scale(1.6)" : "translate(-50%, -50%) scale(1)",
          opacity: isHoveringClickable ? 0.8 : 0.45,
          transition: "transform 0.2s ease, opacity 0.2s ease",
          border: "1.5px solid #00ff41"
        }}
        className="absolute w-6 h-6 rounded-full shadow-[0_0_6px_rgba(0,255,65,0.2)]"
      />

      {/* 4. Click impact ripple effect */}
      {clickWave.active && (
        <div
          style={{
            left: `${clickWave.x}px`,
            top: `${clickWave.y}px`,
            animation: "click-impact-wave 0.4s ease-out forwards"
          }}
          className="absolute w-2 h-2 rounded-full border-2 border-[#00ff41] pointer-events-none"
        />
      )}

      <style>{`
        @keyframes click-impact-wave {
          0% {
            width: 8px;
            height: 8px;
            transform: translate(-50%, -50%);
            opacity: 1;
          }
          100% {
            width: 45px;
            height: 45px;
            transform: translate(-50%, -50%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
