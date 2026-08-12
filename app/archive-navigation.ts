export type ArchiveDirection = -1 | 1;

export function adjacentTokenId(
  tokenIds: readonly string[],
  selectedTokenId: string,
  direction: ArchiveDirection,
): string | null {
  const sequence = tokenIds.filter(Boolean);
  const selectedIndex = sequence.indexOf(selectedTokenId);
  if (selectedIndex < 0) return null;
  return sequence[selectedIndex + direction] ?? null;
}

export function isTextEntryTarget(target: EventTarget | null): boolean {
  const element = target as { isContentEditable?: boolean; tagName?: string } | null;
  return Boolean(
    element?.isContentEditable
      || element?.tagName === "INPUT"
      || element?.tagName === "TEXTAREA"
      || element?.tagName === "SELECT",
  );
}

export function mintedWorkHref(owner: string, collection: string, tokenId: string): string {
  const query = new URLSearchParams({ owner, collection, token: tokenId });
  return `?${query.toString()}`;
}
