export type TxlineNetwork = "mainnet" | "devnet";

export const txlineNetworks = {
  mainnet: {
    label: "Mainnet real-time free tier",
    network: "mainnet" as const,
    rpcUrl: "https://solana-rpc.publicnode.com",
    apiOrigin: "https://txline.txodds.com",
    programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
    txlTokenMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
    serviceLevelId: 12,
    weeks: 4,
    note: "Best for final prize submission; free data tier, but the Solana transaction may require a tiny SOL network fee.",
  },
  devnet: {
    label: "Devnet delayed free tier",
    network: "devnet" as const,
    rpcUrl: "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
    txlTokenMint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
    serviceLevelId: 1,
    weeks: 4,
    note: "Good for no-cost activation testing if your wallet supports Solana devnet.",
  },
};

export const subscribeDiscriminator = Uint8Array.from([254, 28, 191, 138, 156, 179, 183, 53]);
