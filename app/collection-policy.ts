export const collectionDenylist: Readonly<Record<string, ReadonlySet<string>>> = {
  "zeropoet.eth": new Set([
    "0x1066d77f2b0ffe7a667e95ebc442866088ab1248",
  ]),
};

export function isCollectionAllowed(owner: string | null, contractAddress: string): boolean {
  if (!owner) return true;
  const denylist = collectionDenylist[owner.toLowerCase()];
  return denylist ? !denylist.has(contractAddress.toLowerCase()) : true;
}
