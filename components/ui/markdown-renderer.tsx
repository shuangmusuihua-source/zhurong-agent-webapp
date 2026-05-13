"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const remarkPlugins = [remarkGfm];

const markdownComponents = {
  table: ({ children }: { children: React.ReactNode }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-border">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-muted">{children}</thead>
  ),
  th: ({ children }: { children: React.ReactNode }) => (
    <th className="border border-border px-3 py-2 text-left font-semibold">{children}</th>
  ),
  td: ({ children }: { children: React.ReactNode }) => (
    <td className="border border-border px-3 py-2">{children}</td>
  ),
  pre: ({ children }: { children: React.ReactNode }) => (
    <pre className="bg-muted rounded-lg p-4 overflow-x-auto my-4">{children}</pre>
  ),
  code: ({ className, children, ...props }: { className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) => {
    if (!className) {
      return <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>{children}</code>;
    }
    return <code className={className} {...props}>{children}</code>;
  },
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
  ),
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-2xl font-bold my-4">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-xl font-bold my-3">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-lg font-semibold my-2">{children}</h3>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="my-2 leading-relaxed">{children}</p>
  ),
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground">{children}</blockquote>
  ),
};

export function MarkdownRenderer({ content }: { content: string }) {
  const rendered = useMemo(() => (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  ), [content]);

  return <div className="prose prose-sm dark:prose-invert max-w-none">{rendered}</div>;
}