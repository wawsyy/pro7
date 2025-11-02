"use client";

import { useFhevm } from "@/fhevm/useFhevm";
import { useLuckyDraw } from "@/hooks/useLuckyDraw";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { errorNotDeployed } from "./ErrorNotDeployed";
import clsx from "clsx";
import { useState } from "react";

const formatAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const EncryptedLuckyDrawDashboard = () => {
  const { storage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const luckyDraw = useLuckyDraw({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage: storage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [name, setName] = useState("");

  const canSubmitName = name.trim().length > 1 && luckyDraw.canRegister;

  const handleRegister = async () => {
    if (!canSubmitName) return;
    await luckyDraw.registerParticipant(name.trim());
    setName("");
  };

  if (!isConnected) {
    return (
      <section className="mx-auto mt-12 grid w-full max-w-3xl gap-6 rounded-3xl border border-white/10 bg-white/10 p-12 text-center shadow-xl backdrop-blur">
        <h2 className="text-3xl font-semibold text-white">Connect Your Wallet</h2>
        <p className="text-base text-white/80">
          Use the Rainbow wallet button in the top-right corner to connect before participating in the encrypted lucky
          draw.
        </p>
        <button
          type="button"
          onClick={connect}
          className="mx-auto inline-flex items-center justify-center rounded-full bg-white/90 px-6 py-3 text-sm font-medium uppercase tracking-wide text-gray-900 shadow-lg transition hover:bg-white"
        >
          Detect MetaMask
        </button>
      </section>
    );
  }

  if (!luckyDraw.isDeployed) {
    return errorNotDeployed(chainId);
  }

  const winnerFingerprint =
    luckyDraw.winnerNameClear?.clear !== undefined
      ? luckyDraw.winnerNameClear.clear.toString()
      : undefined;

  const winnerIndex =
    luckyDraw.winnerIndexClear?.clear !== undefined
      ? luckyDraw.winnerIndexClear.clear.toString()
      : undefined;

  return (
    <section className="flex w-full flex-col gap-8">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/70 via-indigo-600/60 to-sky-500/60 p-[1px] shadow-2xl">
        <div className="rounded-[23px] bg-slate-950/70 p-10 backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-200/70">Encrypted Lucky Draw MVP</p>
              <h1 className="mt-2 text-4xl font-semibold text-white md:text-5xl">Participate with Privacy</h1>
              <p className="mt-4 max-w-xl text-base text-slate-200/80">
                Upload your identity as a fully homomorphic encrypted fingerprint. The system performs a privacy-preserving
                random draw and lets every participant decrypt the anonymous result locally.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-100 shadow-inner">
              <ul className="space-y-2 font-mono">
                <li>
                  <span className="text-slate-400">Chain:</span>{" "}
                  {chainId ? `#${chainId}` : "unknown"}
                </li>
                <li>
                  <span className="text-slate-400">Account:</span>{" "}
                  {accounts && accounts.length > 0 ? formatAddress(accounts[0]) : "not detected"}
                </li>
                <li>
                  <span className="text-slate-400">FHE Runtime:</span>{" "}
                  {fhevmStatus === "ready" ? "ready" : fhevmStatus}
                </li>
                {fhevmError && (
                  <li className="text-red-300">FHE Error: {fhevmError.message}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-1 rounded-3xl border border-white/5 bg-slate-950/60 p-8 shadow-xl backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Register for the Draw</h2>
          <p className="mt-2 text-sm text-slate-300/70">
            Your name is fingerprinted locally, encrypted with the Zama FHEVM toolkit, and stored on-chain.
          </p>
          <div className="mt-6 space-y-4">
            <label className="flex flex-col gap-2 text-sm text-slate-200/80">
              Display Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Alice Wonder"
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-sky-400/80 focus:bg-slate-900/70"
              />
            </label>
            <button
              type="button"
              disabled={!canSubmitName}
              onClick={handleRegister}
              className={clsx(
                "w-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition",
                !canSubmitName && "cursor-not-allowed opacity-40",
              )}
            >
              {luckyDraw.isRegistering ? "Encrypting..." : "Encrypt & Join"}
            </button>
            <p className="text-xs text-slate-300/70">
              At least two encrypted participants are required before a winner can be drawn.
            </p>
          </div>
        </div>

        <div className="col-span-1 rounded-3xl border border-white/5 bg-slate-950/60 p-8 shadow-xl backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Encrypted Winner</h2>
          <p className="mt-2 text-sm text-slate-300/70">
            Once a winner is drawn, decrypt the encrypted index and fingerprint locally with your wallet keys.
          </p>
          <div className="mt-6 space-y-3 text-sm text-slate-200/80">
            <p>
              <span className="text-slate-400">Winner account:</span>{" "}
              {luckyDraw.winnerAccount ? formatAddress(luckyDraw.winnerAccount) : "pending"}
            </p>
            <p>
              <span className="text-slate-400">Encrypted index:</span>{" "}
              {luckyDraw.winnerIndexHandle ?? "—"}
            </p>
            <p>
              <span className="text-slate-400">Encrypted fingerprint:</span>{" "}
              {luckyDraw.winnerNameHandle ?? "—"}
            </p>
            <p>
              <span className="text-slate-400">Decrypted index:</span>{" "}
              {winnerIndex ?? "not decrypted"}
            </p>
            <p>
              <span className="text-slate-400">Decrypted fingerprint:</span>{" "}
              {winnerFingerprint ?? "not decrypted"}
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={luckyDraw.drawWinner}
              disabled={!luckyDraw.canDraw}
              className={clsx(
                "rounded-full bg-white/90 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-white",
                !luckyDraw.canDraw && "cursor-not-allowed opacity-40",
              )}
            >
              {luckyDraw.isDrawing ? "Selecting..." : "Draw Winner"}
            </button>
            <button
              type="button"
              onClick={luckyDraw.decryptWinner}
              disabled={!luckyDraw.canDecryptWinner}
              className={clsx(
                "rounded-full border border-sky-400/60 px-6 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20",
                !luckyDraw.canDecryptWinner && "cursor-not-allowed opacity-40",
              )}
            >
              {luckyDraw.isDecrypting ? "Decrypting..." : "Decrypt Winner Data"}
            </button>
          </div>
        </div>

        <div className="col-span-1 rounded-3xl border border-white/5 bg-slate-950/60 p-8 shadow-xl backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Participants</h2>
          <p className="mt-2 text-sm text-slate-300/70">
            All submitted fingerprints remain encrypted on-chain. Addresses are displayed for auditability only.
          </p>
          <div className="mt-6 max-h-72 space-y-3 overflow-y-auto pr-2">
            {luckyDraw.participants.length === 0 && (
              <p className="text-sm text-slate-400">No encrypted participants yet.</p>
            )}
            {luckyDraw.participants.map((participant) => (
              <div
                key={participant.index}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200/90"
              >
                <span className="font-mono text-xs text-slate-400">#{participant.index}</span>
                <span className="font-medium">{formatAddress(participant.account)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="rounded-3xl border border-white/10 bg-slate-950/70 px-8 py-6 text-sm text-slate-200/80 shadow-inner backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-white/90">System message</p>
            <p className="mt-1 text-xs text-slate-300/70">
              {luckyDraw.message || "Ready to accept encrypted registrations."}
            </p>
          </div>
          <div className="flex gap-3 text-xs text-slate-400">
            <span>FHE runtime: {fhevmStatus}</span>
            <span>Refresh status: {luckyDraw.isRefreshing ? "running" : "idle"}</span>
            <span>Registered: {luckyDraw.participants.length}</span>
          </div>
        </div>
      </footer>
    </section>
  );
};

