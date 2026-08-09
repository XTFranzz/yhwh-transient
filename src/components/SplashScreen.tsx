import { useEffect, useState } from "react";

const FULL_CLIP = "inset(0% 0% 0% 0%)";
const HIDDEN_RIGHT_CLIP = "inset(0% 100% 0% 0%)";

const POP_MS = 500;
const HOUSE_HOLD_MS = 250;
const CIRCLE_MS = 550;
const CIRCLE_HOLD_MS = 250;
const WIPE_MS = 700;
const FINAL_HOLD_MS = 500;
const EXIT_MS = 450;

const BOUNCE = "cubic-bezier(0.34, 1.56, 0.64, 1)";

type Phase = "start" | "house" | "circle" | "final" | "exit" | "done";

const PHASE_AFTER: Record<Phase, number> = {
  start: 20,
  house: POP_MS + HOUSE_HOLD_MS,
  circle: CIRCLE_MS + CIRCLE_HOLD_MS,
  final: WIPE_MS + FINAL_HOLD_MS,
  exit: EXIT_MS,
  done: 0,
};

const NEXT_PHASE: Record<Phase, Phase> = {
  start: "house",
  house: "circle",
  circle: "final",
  final: "exit",
  exit: "done",
  done: "done",
};

export function SplashScreen() {
  const [phase, setPhase] = useState<Phase>("start");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      const t1 = setTimeout(() => setPhase("final"), 20);
      const t2 = setTimeout(() => setPhase("exit"), 520);
      const t3 = setTimeout(() => setPhase("done"), 520 + EXIT_MS);
      return () => {
        [t1, t2, t3].forEach(clearTimeout);
        document.body.style.overflow = "";
      };
    }

    let current: Phase = "start";
    const timers: ReturnType<typeof setTimeout>[] = [];
    const scheduleNext = (elapsed: number) => {
      if (current === "done") return;
      timers.push(
        setTimeout(() => {
          current = NEXT_PHASE[current];
          setPhase(current);
          scheduleNext(PHASE_AFTER[current]);
        }, elapsed),
      );
    };
    scheduleNext(PHASE_AFTER.start);

    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = "";
    };
  }, []);

  if (phase === "done") return null;

  const houseRevealed = phase !== "start";
  const circleRevealed = phase === "circle" || phase === "final" || phase === "exit";
  const finalRevealed = phase === "final" || phase === "exit";
  const isExiting = phase === "exit";

  return (
    <div
      style={{
        transition: `opacity ${EXIT_MS}ms ease-out, transform ${EXIT_MS}ms ease-out`,
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? "scale(1.05)" : "scale(1)",
        pointerEvents: isExiting ? "none" : "auto",
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
      data-phase={phase}
    >
      <div className="relative w-56 sm:w-64" style={{ aspectRatio: "2048 / 1218" }}>
        <img
          src="/yhwh_noline.jpg"
          alt=""
          style={{
            opacity: houseRevealed && !circleRevealed ? 1 : 0,
            transform: houseRevealed ? "scale(1)" : "scale(0.8)",
            transition: `opacity ${circleRevealed ? CIRCLE_MS : POP_MS}ms ${circleRevealed ? "ease-out" : BOUNCE}, transform ${POP_MS}ms ${BOUNCE}`,
          }}
          className="absolute left-1/2 top-1/2 aspect-square h-full w-auto -translate-x-1/2 -translate-y-1/2 object-contain"
        />
        <img
          src="/yhwh-clear.png"
          alt=""
          style={{
            opacity: circleRevealed ? 1 : 0,
            transform: houseRevealed ? "scale(1)" : "scale(0.8)",
            transition: `opacity ${CIRCLE_MS}ms ease-out, transform ${POP_MS}ms ${BOUNCE}`,
          }}
          className="absolute left-1/2 top-1/2 aspect-square h-full w-auto -translate-x-1/2 -translate-y-1/2 object-contain"
        />
        <img
          src="/yhwh_noVAtxt.jpg"
          alt="YHWH Transient — Your Home With Harmony"
          style={{
            clipPath: finalRevealed ? FULL_CLIP : HIDDEN_RIGHT_CLIP,
            transition: `clip-path ${WIPE_MS}ms ease-in-out`,
          }}
          className="absolute inset-0 h-full w-full rounded-2xl object-contain"
        />
      </div>
    </div>
  );
}
