import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { CheckCircle2, ExternalLink, KeyRound, Radio, Send, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { subscribeDiscriminator, txlineNetworks, type TxlineNetwork } from "../shared/txlineConfig";

type WalletProvider = {
  name?: string;
  publicKey?: PublicKey | { toString(): string; toBase58?: () => string };
  isPhantom?: boolean;
  isOKXWallet?: boolean;
  connect: (args?: unknown) => Promise<{ publicKey?: PublicKey } | void>;
  disconnect?: () => Promise<void>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
  signAndSendTransaction?: (transaction: Transaction) => Promise<{ signature?: string } | string>;
  signMessage?: (message: Uint8Array, display?: string) => Promise<Uint8Array | { signature: Uint8Array }>;
};

type WalletOption = {
  id: string;
  label: string;
  provider: WalletProvider;
};

type StepLog = {
  tone: "info" | "ok" | "warn" | "error";
  text: string;
};

export function ActivateTxline() {
  const [network, setNetwork] = useState<TxlineNetwork>("mainnet");
  const [wallets, setWallets] = useState<WalletOption[]>(() => detectWallets());
  const [provider, setProvider] = useState<WalletProvider | null>(null);
  const [publicKey, setPublicKey] = useState<string>("");
  const [balance, setBalance] = useState<number | null>(null);
  const [txSig, setTxSig] = useState("");
  const [jwt, setJwt] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<StepLog[]>([
    { tone: "info", text: "Ready. Connect a Solana wallet, then subscribe to the TxLINE free tier." },
  ]);

  const config = txlineNetworks[network];
  const connection = useMemo(() => new Connection(config.rpcUrl, "confirmed"), [config.rpcUrl]);

  async function refreshWallets() {
    setWallets(detectWallets());
    pushLog("info", "Wallet detection refreshed.");
  }

  async function connectWallet(option: WalletOption) {
    setBusy(true);
    try {
      pushLog("info", `Connecting ${option.label}. Approve the wallet popup if it appears.`);
      const result = await option.provider.connect();
      const key = publicKeyToString(result?.publicKey || option.provider.publicKey);
      if (!key) throw new Error("Wallet connected but no public key was returned.");
      setProvider(option.provider);
      setPublicKey(key);
      const lamports = await connection.getBalance(new PublicKey(key));
      setBalance(lamports / LAMPORTS_PER_SOL);
      pushLog("ok", `Connected ${shortKey(key)} on ${config.label}. Balance: ${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL.`);
    } catch (error) {
      pushLog("error", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function requestDevnetSol() {
    if (!publicKey || network !== "devnet") return;
    setBusy(true);
    try {
      pushLog("info", "Requesting 1 devnet SOL airdrop.");
      const signature = await connection.requestAirdrop(new PublicKey(publicKey), LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature, "confirmed");
      const lamports = await connection.getBalance(new PublicKey(publicKey));
      setBalance(lamports / LAMPORTS_PER_SOL);
      pushLog("ok", `Devnet SOL received. Balance: ${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL.`);
    } catch (error) {
      pushLog("error", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function subscribeFreeTier() {
    if (!provider || !publicKey) {
      pushLog("warn", "Connect a wallet first.");
      return;
    }

    setBusy(true);
    try {
      const payer = new PublicKey(publicKey);
      pushLog("info", `Building subscribe transaction: service level ${config.serviceLevelId}, ${config.weeks} weeks.`);
      const transaction = await buildSubscribeTransaction(connection, payer, network);
      pushLog("warn", "Wallet confirmation needed now. Please click Confirm/Approve in your wallet popup.");

      let signature = "";
      if (provider.signAndSendTransaction) {
        const result = await provider.signAndSendTransaction(transaction);
        signature = typeof result === "string" ? result : result.signature || "";
      } else if (provider.signTransaction) {
        const signed = await provider.signTransaction(transaction);
        signature = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });
      } else {
        throw new Error("Wallet does not expose signAndSendTransaction or signTransaction.");
      }

      if (!signature) throw new Error("Wallet did not return a transaction signature.");
      setTxSig(signature);
      pushLog("info", `Transaction sent: ${signature}`);
      const confirmation = await connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`Subscription transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      pushLog("ok", "Subscription transaction confirmed.");
    } catch (error) {
      pushLog("error", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function activateToken() {
    if (!provider || !txSig) {
      pushLog("warn", "Complete the subscription transaction first.");
      return;
    }
    if (!provider.signMessage) {
      pushLog("error", "Wallet does not expose signMessage. Try Phantom/Solflare if OKX cannot sign messages.");
      return;
    }

    setBusy(true);
    try {
      pushLog("info", "Starting TxLINE guest session through local server.");
      const guestResponse = await fetch("/api/activation/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network }),
      });
      const guest = await guestResponse.json();
      if (!guestResponse.ok || !guest.token) throw new Error(guest.error || "Guest session failed");
      setJwt(guest.token);

      const messageString = `${txSig}::${guest.token}`;
      const message = new TextEncoder().encode(messageString);
      pushLog("warn", "Message signature needed now. Please click Sign in your wallet popup.");
      const signed = await provider.signMessage(message, "utf8");
      const signatureBytes = signed instanceof Uint8Array ? signed : signed.signature;
      const walletSignature = bytesToBase64(signatureBytes);

      pushLog("info", "Calling TxLINE activation endpoint.");
      const activationResponse = await fetch("/api/activation/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network,
          txSig,
          walletSignature,
          jwt: guest.token,
        }),
      });
      const activation = await activationResponse.json();
      if (!activationResponse.ok || !activation.apiToken) {
        throw new Error(activation.error || JSON.stringify(activation.data || activation));
      }
      setApiToken(activation.apiToken);
      pushLog("ok", "TxLINE API token activated and saved to .env.local.");
    } catch (error) {
      pushLog("error", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function testLiveAccess() {
    setBusy(true);
    try {
      const response = await fetch("/api/txline/fixtures");
      const text = await response.text();
      if (!response.ok) throw new Error(`${response.status}: ${text}`);
      pushLog("ok", `Live fixture access works. Response length: ${text.length}.`);
    } catch (error) {
      pushLog("error", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function pushLog(tone: StepLog["tone"], text: string) {
    setLogs((items) => [{ tone, text }, ...items].slice(0, 12));
  }

  return (
    <main className="activate-shell">
      <section className="activate-hero">
        <div className="brand-block">
          <div className="brand-mark">
            <KeyRound size={18} />
          </div>
          <div>
            <h1>TxLINE Activation</h1>
            <span>SignalDesk live data setup</span>
          </div>
        </div>
        <a className="doc-link" href="/" title="Back to SignalDesk">
          Dashboard <ExternalLink size={15} />
        </a>
      </section>

      <section className="activate-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Network</span>
              <h2>Choose free tier</h2>
            </div>
            <Radio size={20} />
          </div>

          <div className="network-grid">
            {(["mainnet", "devnet"] as const).map((item) => (
              <button
                key={item}
                className={network === item ? "network-card active" : "network-card"}
                onClick={() => {
                  setNetwork(item);
                  setBalance(null);
                  pushLog("info", `Selected ${txlineNetworks[item].label}.`);
                }}
              >
                <strong>{txlineNetworks[item].label}</strong>
                <span>{txlineNetworks[item].note}</span>
              </button>
            ))}
          </div>

          <div className="activation-summary">
            <KeyValue label="Program" value={config.programId} />
            <KeyValue label="Service level" value={config.serviceLevelId} />
            <KeyValue label="Weeks" value={config.weeks} />
            <KeyValue label="Wallet" value={publicKey ? shortKey(publicKey) : "not connected"} />
            <KeyValue label="Balance" value={balance == null ? "--" : `${balance.toFixed(4)} SOL`} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Wallet</span>
              <h2>Connect and sign</h2>
            </div>
            <Wallet size={20} />
          </div>

          <div className="wallet-list">
            {wallets.length === 0 ? (
              <div className="empty-state">No Solana wallet detected in this browser tab.</div>
            ) : (
              wallets.map((option) => (
                <button
                  key={option.id}
                  className="wallet-button"
                  onClick={() => connectWallet(option)}
                  disabled={busy}
                >
                  {option.label}
                </button>
              ))
            )}
            <button className="wallet-button subtle" onClick={refreshWallets} disabled={busy}>
              Refresh wallets
            </button>
          </div>

          <div className="activation-actions">
            {network === "devnet" && (
              <button onClick={requestDevnetSol} disabled={busy || !publicKey}>
                Get devnet SOL
              </button>
            )}
            <button onClick={subscribeFreeTier} disabled={busy || !publicKey}>
              <Send size={16} />
              Subscribe free tier
            </button>
            <button onClick={activateToken} disabled={busy || !txSig}>
              <CheckCircle2 size={16} />
              Activate API token
            </button>
            <button onClick={testLiveAccess} disabled={busy || !apiToken}>
              Test live access
            </button>
          </div>
        </section>

        <section className="panel activation-log-panel">
          <div className="panel-heading compact">
            <div>
              <span className="eyebrow">Status</span>
              <h2>Activation log</h2>
            </div>
          </div>
          <div className="activation-log">
            {logs.map((log, index) => (
              <div className={`log-line ${log.tone}`} key={`${log.text}-${index}`}>
                {log.text}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

async function buildSubscribeTransaction(connection: Connection, payer: PublicKey, network: TxlineNetwork) {
  const config = txlineNetworks[network];
  const programId = new PublicKey(config.programId);
  const txlTokenMint = new PublicKey(config.txlTokenMint);
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    programId,
  );
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    programId,
  );
  const userTokenAccount = getAssociatedTokenAddressSync(
    txlTokenMint,
    payer,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
  const createUserTokenAccountInstruction = userTokenAccountInfo
    ? null
    : createAssociatedTokenAccountInstruction(
        payer,
        userTokenAccount,
        payer,
        txlTokenMint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

  const data = new Uint8Array(11);
  data.set(subscribeDiscriminator, 0);
  data[8] = config.serviceLevelId & 0xff;
  data[9] = (config.serviceLevelId >> 8) & 0xff;
  data[10] = config.weeks;

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: pricingMatrixPda, isSigner: false, isWritable: false },
      { pubkey: txlTokenMint, isSigner: false, isWritable: false },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: tokenTreasuryVault, isSigner: false, isWritable: true },
      { pubkey: tokenTreasuryPda, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  const transaction = new Transaction();
  if (createUserTokenAccountInstruction) transaction.add(createUserTokenAccountInstruction);
  transaction.add(instruction);
  transaction.feePayer = payer;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  (transaction as Transaction & { lastValidBlockHeight?: number }).lastValidBlockHeight = lastValidBlockHeight;
  return transaction;
}

function detectWallets(): WalletOption[] {
  const w = window as unknown as {
    solana?: WalletProvider;
    okxwallet?: { solana?: WalletProvider } & WalletProvider;
  };
  const options: WalletOption[] = [];
  const seen = new Set<WalletProvider>();

  if (w.solana) {
    options.push({
      id: "solana",
      label: w.solana.isPhantom ? "Phantom / window.solana" : "Solana wallet",
      provider: w.solana,
    });
    seen.add(w.solana);
  }

  if (w.okxwallet?.solana && !seen.has(w.okxwallet.solana)) {
    options.push({
      id: "okx-solana",
      label: "OKX Web3 Solana",
      provider: w.okxwallet.solana,
    });
    seen.add(w.okxwallet.solana);
  }

  if (w.okxwallet?.connect && !seen.has(w.okxwallet)) {
    options.push({
      id: "okx",
      label: "OKX Web3",
      provider: w.okxwallet,
    });
  }

  return options;
}

function publicKeyToString(value: WalletProvider["publicKey"] | undefined) {
  if (!value) return "";
  if ("toBase58" in value && typeof value.toBase58 === "function") return value.toBase58();
  return value.toString();
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function shortKey(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) return JSON.stringify(error);
  return String(error);
}

function KeyValue({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="key-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
