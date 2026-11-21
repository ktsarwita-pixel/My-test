import { useEffect, useRef } from "react";
import { Game } from "./game/game";
import { Renderer } from "./game/render";

const GAME_KEYS = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"]);

export default function App() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const game = new Game();
    const renderer = new Renderer(canvas);
    let scale = 1;
    (window as unknown as { __game?: Game }).__game = game;

    const resize = () => {
      const cw = wrap.clientWidth || window.innerWidth;
      const ch = wrap.clientHeight || window.innerHeight;
      const { W, H, scale: s } = game.resize(cw, ch);
      scale = s;
      renderer.resize(W, H);
      canvas.style.width = W * s + "px";
      canvas.style.height = H * s + "px";
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      game.update(dt);
      renderer.draw(game);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const pos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
    };
    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const p = pos(e);
      game.pointerDown(e.pointerId, p.x, p.y, e.pointerType === "touch");
    };
    const onMove = (e: PointerEvent) => {
      const p = pos(e);
      game.pointerMove(e.pointerId, p.x);
    };
    const onUp = (e: PointerEvent) => {
      game.sfx.init(); // iOS unlocks audio on pointer release
      game.pointerUp(e.pointerId);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      game.keyDown(e.code, e.repeat);
    };
    const onKeyUp = (e: KeyboardEvent) => game.keyUp(e.code);
    const onBlur = () => {
      game.keys.clear();
      game.held.clear();
      game.drag = null;
    };
    const onVis = () => {
      const ctx = game.sfx.ctx;
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    };
    const noMenu = (e: Event) => e.preventDefault();

    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("contextmenu", noMenu);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
      wrap.removeEventListener("contextmenu", noMenu);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 touch-none overflow-hidden bg-black select-none"
      style={{ touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 block"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
