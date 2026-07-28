export type MentionUser = {
  id: string;
  fullName: string;
  username: string;
  avatar?: string | null;
  email?: string;
};

export type MentionMember = {
  user: MentionUser;
};

export function mentionLabel(user: MentionUser): string {
  return user.username ? `@${user.username}` : `@${user.fullName}`;
}

export function filterMembers(
  members: MentionMember[],
  query: string,
): MentionMember[] {
  const q = query.toLowerCase();
  if (!q) return members;
  return members.filter((m) => {
    const uname = m.user.username?.toLowerCase() ?? "";
    const name = m.user.fullName.toLowerCase();
    return uname.includes(q) || name.includes(q);
  });
}

/** Active @-query at cursor: `@` through cursor with no whitespace in the query. */
export function getActiveMention(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  const slice = text.slice(0, cursor);
  const match = slice.match(/(?:^|[\s([{])@([^\s@]*)$/);
  if (!match) return null;
  const query = match[1] ?? "";
  return { start: slice.length - query.length - 1, query };
}

export function insertMention(
  text: string,
  mentionStart: number,
  cursor: number,
  member: MentionMember,
): { text: string; cursor: number } {
  const label = mentionLabel(member.user);
  const before = text.slice(0, mentionStart);
  const after = text.slice(cursor);
  const next = `${before}${label} ${after}`;
  return { text: next, cursor: before.length + label.length + 1 };
}

type MentionLabel = { label: string; user: MentionUser };

function buildMentionLabels(members: MentionMember[]): MentionLabel[] {
  const seen = new Set<string>();
  const labels: MentionLabel[] = [];
  for (const m of members) {
    const candidates = m.user.username
      ? [`@${m.user.username}`, `@${m.user.fullName}`]
      : [`@${m.user.fullName}`];
    for (const label of candidates) {
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      labels.push({ label, user: m.user });
    }
  }
  return labels.sort((a, b) => b.label.length - a.label.length);
}

function isMentionBoundary(content: string, end: number) {
  if (end >= content.length) return true;
  const next = content[end];
  return /[\s.,!?;:)\]}]/.test(next);
}

export type ParsedMentionToken = {
  label: string;
  user?: MentionUser;
  start: number;
  end: number;
};

/** Resolve @tokens in plain text against known workspace members. */
export function parseMentionTokens(
  text: string,
  members: MentionMember[],
): ParsedMentionToken[] {
  const labels = buildMentionLabels(members);
  const tokens: ParsedMentionToken[] = [];
  let i = 0;
  while (i < text.length) {
    const at = text.indexOf("@", i);
    if (at === -1) break;

    let matched: ParsedMentionToken | null = null;
    for (const { label, user } of labels) {
      const slice = text.slice(at, at + label.length);
      if (
        slice.toLowerCase() === label.toLowerCase() &&
        isMentionBoundary(text, at + label.length)
      ) {
        matched = {
          label: slice,
          user,
          start: at,
          end: at + label.length,
        };
        break;
      }
    }

    if (matched) {
      tokens.push(matched);
      i = matched.end;
    } else {
      const rest = text.slice(at);
      const unknown = rest.match(/^@[^\s@]+/);
      tokens.push({
        label: unknown?.[0] ?? "@",
        start: at,
        end: at + (unknown?.[0]?.length ?? 1),
      });
      i = at + (unknown?.[0]?.length ?? 1);
    }
  }
  return tokens;
}

export function extractMentionUserIds(
  text: string,
  members: MentionMember[],
): string[] {
  const ids = new Set<string>();
  for (const token of parseMentionTokens(text, members)) {
    if (token.user) ids.add(token.user.id);
  }
  return [...ids];
}
