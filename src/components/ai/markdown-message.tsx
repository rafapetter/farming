"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import type { UIMessage } from "@ai-sdk/react";

export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("");
}

interface MarkdownMessageProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export const MarkdownMessage = memo(function MarkdownMessage({
  content,
  className,
  isStreaming,
}: MarkdownMessageProps) {
  return (
    <div className={`markdown-content ${className ?? ""}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0 pb-1 border-b">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mb-1.5 mt-2 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold mb-1 mt-2 first:mt-0">
              {children}
            </h4>
          ),
          code: ({ children, className: cn }) => {
            const isBlock = cn?.includes("language-");
            if (isBlock) {
              return (
                <pre className="bg-muted rounded-lg p-3 my-2 overflow-x-auto text-xs leading-relaxed">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="text-left px-3 py-2 font-semibold text-xs whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-t text-xs">{children}</td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-primary/30 pl-3 my-2 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse rounded-sm ml-0.5 align-text-bottom" />
      )}
    </div>
  );
});
