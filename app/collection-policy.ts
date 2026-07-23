export const collectionDenylist: Readonly<Record<string, ReadonlySet<string>>> = {
  "mancel.eth": new Set([
    "0x26f61798069141ae83f867ee0a916f1c6cc8459b",
    "0x357d87c6c75a8f0a60b2d0dfc7edfe4e20468203",
    "0x367aa3704cb821e9ee639e9c38dc9986931ead59",
    "0x4ebc94fd959d2c4b33ca75963c6b5e95b7bf4a21",
    "0x578f7b9351f923a3c7ad82f5dca3582cf9eb8153",
    "0x6fd6679c599afc1b78985a614adc8a3f8c02eb6b",
    "0x703e25001b432437a5c9ac42ab836b5df5ee1134",
    "0x7325b92b09e38f586168257ca77fe4e8d381ca69",
    "0x7d180ad4024ac0c3d0f343c7826af73a03519a79",
    "0x852d3ed8f2e99385f372ab77cb0b297975206bff",
    "0x872b23a16240e78ef4bf453e89d6cbf9585752f2",
    "0x8e46f11efc80ba5cacf65966cc6d7442a3b46731",
    "0x8e9eca24f0cfd2a5d1007e67ef53ebeb5887b774",
    "0x9a6a7057cebef435aa3d91d6efd137bbbf147f24",
    "0x9bcecd3aa2add8e564a46cd48b79ce8cecbc21ce",
    "0xc11fa64706ab85faf1d652fc78871c86926a8613",
    "0xcdd02e7849cbbfeaf6401cfdc434999ff5fc0f04",
    "0xd03d2a00148e01fcffe00e2ec6e94192c35fc0a3",
    "0xd901923c90928c490e5396b61dd9e681463e5311",
    "0xe7b98a3707a6b41654e98bf2285f6a30fbec1d43",
  ]),
  "zeropoet.eth": new Set(),
};

export function isCollectionAllowed(owner: string | null, contractAddress: string): boolean {
  if (!owner) return true;
  const denylist = collectionDenylist[owner.toLowerCase()];
  return denylist ? !denylist.has(contractAddress.toLowerCase()) : true;
}
