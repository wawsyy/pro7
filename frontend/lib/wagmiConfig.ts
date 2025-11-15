import { createConfig, http } from "wagmi";
import type { Chain } from "viem/chains";
import { hardhat, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const chains = [hardhat, sepolia] as const satisfies readonly [Chain, ...Chain[]];

const transports: Record<number, ReturnType<typeof http>> = {
  [hardhat.id]: http("http://127.0.0.1:8545"),
  [sepolia.id]: http(
    process.env.NEXT_PUBLIC_SEPOLIA_RPC ??
      "https://sepolia.infura.io/v3/e08e99d213c331aa0fd00f625de06e66",
  ),
};

export const wagmiConfig = createConfig({
  chains,
  connectors: [injected({ shimDisconnect: true })],
  transports,
  ssr: true,
});

