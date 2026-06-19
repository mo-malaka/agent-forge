import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <article className="markdown-content space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-10 border-t border-zinc-200 pt-8 text-xl font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-zinc-600 dark:text-zinc-400">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
              {children}
            </ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
              {children}
            </strong>
          ),
          hr: () => (
            <hr className="border-zinc-200 dark:border-zinc-800" />
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-zinc-300 pl-4 text-zinc-600 italic dark:border-zinc-600 dark:text-zinc-400">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noreferrer" : undefined}
            >
              {children}
            </a>
          ),
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-md bg-zinc-900 p-4 font-mono text-xs leading-relaxed text-zinc-100 dark:bg-zinc-950">
              {children}
            </pre>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.includes("language-");

            if (isBlock) {
              return <code className={className}>{children}</code>;
            }

            return (
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-200 text-left text-sm dark:divide-zinc-800">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-50 dark:bg-zinc-900">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {children}
            </tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
