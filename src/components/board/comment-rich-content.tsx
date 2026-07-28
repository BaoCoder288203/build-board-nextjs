"use client";

import { useMemo } from "react";
import { renderCommentContent } from "@/components/board/mention-hover-chip";
import {
  looksLikeCommentHtml,
  sanitizeCommentHtml,
} from "@/lib/comment-content";
import type { MentionMember } from "@/lib/mentions";

type MentionSource = MentionMember;

function renderInlineChildren(
  el: Element,
  sources: MentionSource[],
  keyPrefix: string,
): React.ReactNode[] {
  return Array.from(el.childNodes).map((child, index) =>
    domNodeToReact(child, sources, `${keyPrefix}-${index}`),
  );
}

function domNodeToReact(
  node: Node,
  sources: MentionSource[],
  key: string,
): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text) return null;
    return (
      <span key={key} className="whitespace-pre-wrap">
        {renderCommentContent(text, sources)}
      </span>
    );
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const children = renderInlineChildren(el, sources, key);

  switch (tag) {
    case "p":
      return (
        <p key={key} className="whitespace-pre-wrap [&:not(:last-child)]:mb-2">
          {children}
        </p>
      );
    case "strong":
    case "b":
      return (
        <strong key={key} className="font-bold">
          {children}
        </strong>
      );
    case "em":
    case "i":
      return (
        <em key={key} className="italic">
          {children}
        </em>
      );
    case "ul":
      return (
        <ul key={key} className="my-1 list-disc space-y-0.5 pl-5">
          {children}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="my-1 list-decimal space-y-0.5 pl-5">
          {children}
        </ol>
      );
    case "li":
      return <li key={key}>{children}</li>;
    case "a": {
      const href = el.getAttribute("href") ?? "#";
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-bb-blue underline underline-offset-2 hover:text-bb-blue-dark"
        >
          {children}
        </a>
      );
    }
    case "br":
      return <br key={key} />;
    default:
      return <span key={key}>{children}</span>;
  }
}

/** Render sanitized HTML with @mention chips in text nodes. */
export function CommentRichContent({
  content,
  sources,
  className = "",
}: {
  content: string;
  sources: MentionSource[];
  className?: string;
}) {
  const nodes = useMemo(() => {
    if (!content) return null;

    if (!looksLikeCommentHtml(content)) {
      return renderCommentContent(content, sources);
    }

    if (typeof window === "undefined") {
      return renderCommentContent(content.replace(/<[^>]+>/g, ""), sources);
    }

    const clean = sanitizeCommentHtml(content);
    const doc = new DOMParser().parseFromString(clean, "text/html");
    return Array.from(doc.body.childNodes).map((child, index) =>
      domNodeToReact(child, sources, `block-${index}`),
    );
  }, [content, sources]);

  return (
    <div className={`text-sm text-bb-ink ${className}`}>
      {nodes ?? null}
    </div>
  );
}
