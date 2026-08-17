"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders the assistant's answers, which are markdown.
 *
 * They were previously split on blank lines into plain paragraphs, so every
 * `**bold**` and every table arrived on screen as its own source text — the
 * pipes and asterisks included. Mbaku reaches for a table whenever it is asked
 * for a list with numbers in it, which is often, and a 25-row opening record
 * rendered as raw pipes is unreadable.
 *
 * `remarkGfm` is what supplies tables; they are not in core markdown.
 *
 * **No raw HTML.** react-markdown ignores embedded HTML unless `rehype-raw` is
 * added, and it must stay that way: this content is model-generated and partly
 * derived from names in imported PGNs, so it is not ours to trust.
 */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="text-sm leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,

          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,

          // Tables are the whole reason this component exists. The wrapper
          // scrolls rather than the page: an opening record is five columns
          // wide and this sits in a chat bubble on a phone.
          table: ({ children }) => (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[24rem] border-collapse text-left text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-gray-300 dark:border-dark-border">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1.5 font-semibold text-gray-900 dark:text-white">{children}</th>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-gray-200 last:border-0 dark:border-dark-border/60">
              {children}
            </tr>
          ),
          td: ({ children }) => <td className="px-2 py-1.5 align-top">{children}</td>,

          h1: ({ children }) => (
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{children}</h4>
          ),
          h2: ({ children }) => (
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{children}</h4>
          ),
          h3: ({ children }) => (
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{children}</h4>
          ),

          code: ({ children }) => (
            <code className="rounded bg-gray-200/70 px-1 py-0.5 font-mono text-xs dark:bg-dark-surface">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg bg-gray-200/70 p-3 font-mono text-xs dark:bg-dark-surface">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gray-300 pl-3 italic dark:border-dark-border">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-gray-200 dark:border-dark-border" />,
          // Links open away from the app; assistant text is not a trusted source.
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-brand-600 underline underline-offset-2 hover:text-brand-700"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
