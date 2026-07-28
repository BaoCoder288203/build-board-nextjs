import DOMPurify from "isomorphic-dompurify";
import {
  extractMentionUserIds,
  type MentionMember,
} from "@/lib/mentions";

const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a"];

export function looksLikeCommentHtml(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

export function sanitizeCommentHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return trimmed;
  return DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
}

export function htmlToPlainText(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return trimmed;
  if (!looksLikeCommentHtml(trimmed)) return trimmed;

  const withBreaks = trimmed
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/li>\s*<li[^>]*>/gi, "\n")
    .replace(/<\/ul>|<\/ol>/gi, "\n");

  return DOMPurify.sanitize(withBreaks, { ALLOWED_TAGS: [] })
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function commentPlainText(content: string): string {
  return looksLikeCommentHtml(content)
    ? htmlToPlainText(content)
    : content.trim();
}

export function extractMentionUserIdsFromComment(
  content: string,
  members: MentionMember[],
): string[] {
  return extractMentionUserIds(commentPlainText(content), members);
}

export function isCommentContentEmpty(content: string): boolean {
  return commentPlainText(content).length === 0;
}
