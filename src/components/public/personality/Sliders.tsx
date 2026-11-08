import { AXES, sliderPosition, type Scores } from "@/lib/chessPersonality";

/** The four sliders, each marker where the answers put it. The end it leans to is in full colour. */
export function Sliders({ scores, colour }: { scores: Scores; colour: string }) {
  return (
    <ul className="flex flex-col gap-5">
      {AXES.map((axis, i) => {
        const right = scores[i] >= 3;
        const pct = `${sliderPosition(scores[i]) * 100}%`;
        return (
          <li key={axis.key}>
            <div className="mb-2 flex justify-between text-[13px] uppercase tracking-[0.08em]">
              <span className={right ? "text-ink-faint" : "font-[600] text-ink-text"}>{axis.left}</span>
              <span className={right ? "font-[600] text-ink-text" : "text-ink-faint"}>{axis.right}</span>
            </div>
            <div
              className="relative h-2.5 rounded-pill bg-ink-raised"
              role="meter"
              aria-label={`${axis.left} to ${axis.right}`}
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={scores[i]}
              aria-valuetext={`${right ? axis.right : axis.left}, ${right ? scores[i] : 5 - scores[i]} of 5`}
            >
              <span
                className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ink-canvas"
                style={{ left: pct, background: colour }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
