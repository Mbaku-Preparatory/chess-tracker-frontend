import type { ReactNode } from "react";

export type Question = { q: string; a: ReactNode; id?: string };

/** Questions and answers, two columns from md up: the pricing page and the help page. */
export function QuestionList({ questions }: { questions: Question[] }) {
  return (
    <dl className="grid gap-x-12 gap-y-10 md:grid-cols-2">
      {questions.map(({ q, a, id }) => (
        <div key={q} id={id} className="flex scroll-mt-24 flex-col gap-2">
          <dt className="text-[18px] font-[480]">{q}</dt>
          <dd className="max-w-[60ch] text-[16px] leading-[1.55] text-ink-muted">{a}</dd>
        </div>
      ))}
    </dl>
  );
}
