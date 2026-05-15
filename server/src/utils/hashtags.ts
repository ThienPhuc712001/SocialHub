export function extractHashtags(content: string): string[] {
  const matches = content.match(/#(\w+)/g);
  if (!matches) return [];
  return matches.map(tag => tag.substring(1).toLowerCase());
}