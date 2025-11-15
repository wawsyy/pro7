"use client";

import { EncryptedLuckyDrawABI } from "@/abi/EncryptedLuckyDrawABI";
import { EncryptedLuckyDrawAddresses } from "@/abi/EncryptedLuckyDrawAddresses";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { ethers, keccak256, toUtf8Bytes } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type LuckyDrawContractInfo = {
  abi: typeof EncryptedLuckyDrawABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

type Participant = {
  index: number;
  account: string;
};

type ClearValue = {
  handle: string;
  clear: string | bigint;
};

const NAME_MASK = (1n << 64n) - 1n;

const getLuckyDrawByChainId = (chainId: number | undefined): LuckyDrawContractInfo => {
  if (!chainId) {
    return { abi: EncryptedLuckyDrawABI.abi };
  }

  const entry =
    EncryptedLuckyDrawAddresses[
      chainId.toString() as keyof typeof EncryptedLuckyDrawAddresses
    ];

  if (
    !entry ||
    !("address" in entry) ||
    entry.address === ethers.ZeroAddress
  ) {
    return { abi: EncryptedLuckyDrawABI.abi, chainId };
  }

  return {
    address: entry.address as `0x${string}` | undefined,
    chainId: entry.chainId ?? chainId,
    chainName: entry.chainName,
    abi: EncryptedLuckyDrawABI.abi,
  };
};

const fingerprintName = (name: string): bigint => {
  const hash = keccak256(toUtf8Bytes(name));
  return BigInt(hash) & NAME_MASK;
};

export const useLuckyDraw = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winnerAccount, setWinnerAccount] = useState<string | undefined>(undefined);
  const [winnerIndexHandle, setWinnerIndexHandle] = useState<string | undefined>(undefined);
  const [winnerNameHandle, setWinnerNameHandle] = useState<string | undefined>(undefined);
  const [winnerIndexClear, setWinnerIndexClear] = useState<ClearValue | undefined>(undefined);
  const [winnerNameClear, setWinnerNameClear] = useState<ClearValue | undefined>(undefined);
  const [message, setMessage] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const contractRef = useRef<LuckyDrawContractInfo | undefined>(undefined);

  const luckyDraw = useMemo(() => {
    const info = getLuckyDrawByChainId(chainId);
    contractRef.current = info;
    if (!info.address) {
      setMessage(`EncryptedLuckyDraw deployment not found for chainId=${chainId}.`);
    }
    return info;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!luckyDraw) {
      return false;
    }
    return Boolean(luckyDraw.address && luckyDraw.address !== ethers.ZeroAddress);
  }, [luckyDraw]);

  const fetchWinnerDetails = useCallback(
    async (contract: ethers.Contract) => {
      try {
        const winner = await contract.getWinnerAccount();
        setWinnerAccount(winner);
      } catch {
        setWinnerAccount(undefined);
      }

      try {
        const indexHandle = await contract.getEncryptedWinnerIndex();
        setWinnerIndexHandle(indexHandle);
      } catch {
        setWinnerIndexHandle(undefined);
      }

      try {
        const nameHandle = await contract.getEncryptedWinnerName();
        setWinnerNameHandle(nameHandle);
      } catch {
        setWinnerNameHandle(undefined);
      }
    },
    [],
  );

  const refreshState = useCallback(async () => {
    if (!luckyDraw.address || !ethersReadonlyProvider) {
      setParticipants([]);
      setWinnerAccount(undefined);
      setWinnerIndexHandle(undefined);
      setWinnerNameHandle(undefined);
      return;
    }

    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setMessage("Refreshing encrypted lucky draw state...");

    const contract = new ethers.Contract(
      luckyDraw.address,
      luckyDraw.abi,
      ethersReadonlyProvider,
    );

    try {
      const count: bigint = await contract.getParticipantsCount();
      const nextParticipants: Participant[] = [];

      for (let i = 0n; i < count; i++) {
        try {
          const account: string = await contract.getParticipantAccount(i);
          nextParticipants.push({ index: Number(i), account });
        } catch {
          nextParticipants.push({
            index: Number(i),
            account: "0x0000000000000000000000000000000000000000",
          });
        }
      }

      setParticipants(nextParticipants);
      await fetchWinnerDetails(contract);
      setMessage("Encrypted lucky draw state refreshed.");
    } catch (error) {
      console.error("[useLuckyDraw] refresh failed", error);
      setMessage("Failed to refresh lucky draw state.");
      setParticipants([]);
      setWinnerAccount(undefined);
      setWinnerIndexHandle(undefined);
      setWinnerNameHandle(undefined);
    } finally {
      setIsRefreshing(false);
    }
  }, [ethersReadonlyProvider, fetchWinnerDetails, isRefreshing, luckyDraw.address, luckyDraw.abi]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const canRegister = useMemo(() => {
    return Boolean(
      luckyDraw.address &&
        instance &&
        ethersSigner &&
        !isRegistering &&
        sameSigner.current(ethersSigner),
    );
  }, [ethersSigner, instance, isRegistering, luckyDraw.address, sameSigner]);

  const registerParticipant = useCallback(
    async (name: string) => {
      if (!canRegister || !instance || !ethersSigner || !luckyDraw.address) {
        return;
      }

      const fingerprint = fingerprintName(name);

      setIsRegistering(true);
      setMessage("Encrypting participant fingerprint...");

      try {
        const input = instance.createEncryptedInput(luckyDraw.address, ethersSigner.address);
        input.add64(fingerprint);
        const encrypted = await input.encrypt();

        const contract = new ethers.Contract(luckyDraw.address, luckyDraw.abi, ethersSigner);
        const tx: ethers.TransactionResponse = await contract.registerParticipant(
          encrypted.handles[0],
          encrypted.inputProof,
        );
        setMessage("Waiting for registration transaction confirmation...");
        await tx.wait();
        setMessage("Participant registered successfully.");
        await refreshState();
      } catch (error) {
        console.error("[useLuckyDraw] registerParticipant error", error);
        setMessage("Failed to register participant.");
      } finally {
        setIsRegistering(false);
      }
    },
    [canRegister, ethersSigner, instance, luckyDraw.address, luckyDraw.abi, refreshState],
  );

  const canDraw = useMemo(() => {
    return Boolean(luckyDraw.address && ethersSigner && !isDrawing && participants.length >= 2);
  }, [ethersSigner, isDrawing, luckyDraw.address, participants.length]);

  const drawWinner = useCallback(async () => {
    if (!canDraw || !ethersSigner || !luckyDraw.address) {
      return;
    }

    setIsDrawing(true);
    setMessage("Drawing encrypted winner...");

    try {
      const contract = new ethers.Contract(luckyDraw.address, luckyDraw.abi, ethersSigner);
      const tx: ethers.TransactionResponse = await contract.drawWinner();
      await tx.wait();
      setMessage("Winner drawn successfully.");
      await refreshState();
    } catch (error) {
      console.error("[useLuckyDraw] drawWinner error", error);
      setMessage("Failed to draw winner.");
    } finally {
      setIsDrawing(false);
    }
  }, [canDraw, ethersSigner, luckyDraw.address, luckyDraw.abi, refreshState]);

  const canDecryptWinner = useMemo(() => {
    return (
      luckyDraw.address &&
      instance &&
      ethersSigner &&
      winnerIndexHandle &&
      winnerNameHandle &&
      !isDecrypting
    );
  }, [ethersSigner, instance, isDecrypting, luckyDraw.address, winnerIndexHandle, winnerNameHandle]);

  const decryptWinner = useCallback(async () => {
    if (!canDecryptWinner || !instance || !ethersSigner || !luckyDraw.address) {
      return;
    }

    if (
      !sameSigner.current(ethersSigner) ||
      !sameChain.current(luckyDraw.chainId)
    ) {
      setMessage("Signer or chain changed. Please refresh and try again.");
      return;
    }

    setIsDecrypting(true);
    setMessage("Decrypting encrypted winner data...");

    try {
      const signature = await FhevmDecryptionSignature.loadOrSign(
        instance,
        [luckyDraw.address as `0x${string}`],
        ethersSigner,
        fhevmDecryptionSignatureStorage,
      );

      if (!signature) {
        setMessage("Unable to compute FHEVM decryption signature.");
        return;
      }

      const handles = [];
      if (winnerIndexHandle) {
        handles.push({ handle: winnerIndexHandle, contractAddress: luckyDraw.address });
      }
      if (winnerNameHandle) {
        handles.push({ handle: winnerNameHandle, contractAddress: luckyDraw.address });
      }

      const decrypted = await instance.userDecrypt(
        handles,
        signature.privateKey,
        signature.publicKey,
        signature.signature,
        signature.contractAddresses,
        signature.userAddress,
        signature.startTimestamp,
        signature.durationDays,
      );

      if (winnerIndexHandle) {
        const decryptedIndex = decrypted[winnerIndexHandle];
        if (typeof decryptedIndex === "string" || typeof decryptedIndex === "bigint") {
          setWinnerIndexClear({
            handle: winnerIndexHandle,
            clear: decryptedIndex,
          });
        }
      }

      if (winnerNameHandle) {
        const decryptedName = decrypted[winnerNameHandle];
        if (typeof decryptedName === "string" || typeof decryptedName === "bigint") {
          setWinnerNameClear({
            handle: winnerNameHandle,
            clear: decryptedName,
          });
        }
      }

      setMessage("Winner data decrypted successfully.");
    } catch (error) {
      console.error("[useLuckyDraw] decryptWinner error", error);
      setMessage("Failed to decrypt winner data.");
    } finally {
      setIsDecrypting(false);
    }
  }, [
    canDecryptWinner,
    ethersSigner,
    fhevmDecryptionSignatureStorage,
    instance,
    luckyDraw.address,
    luckyDraw.chainId,
    sameChain,
    sameSigner,
    winnerIndexHandle,
    winnerNameHandle,
  ]);

  useEffect(() => {
    setWinnerIndexClear(undefined);
    setWinnerNameClear(undefined);
  }, [winnerIndexHandle, winnerNameHandle]);

  return {
    isDeployed,
    message,
    participants,
    winnerAccount,
    winnerIndexHandle,
    winnerNameHandle,
    winnerIndexClear,
    winnerNameClear,
    isRefreshing,
    isDecrypting,
    isRegistering,
    isDrawing,
    canRegister,
    canDraw,
    canDecryptWinner,
    registerParticipant,
    drawWinner,
    decryptWinner,
    refreshState,
    contractAddress: luckyDraw.address,
  };
};

