export const collectionDenylist: Readonly<Record<string, ReadonlySet<string>>> = {
  "zeropoet.eth": new Set([
    "0x1066d77f2b0ffe7a667e95ebc442866088ab1248",
    "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85",
    "0x1e3b1154aedee78e10d67aa0001ab5c5b4d1143b",
  ]),
};

export function isCollectionAllowed(owner: string | null, contractAddress: string): boolean {
  if (!owner) return true;
  const denylist = collectionDenylist[owner.toLowerCase()];
  return denylist ? !denylist.has(contractAddress.toLowerCase()) : true;
}
