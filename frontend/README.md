# Encrypted Lucky Draw Frontend

This Next.js app is the user-facing dashboard for the Encrypted Lucky Draw MVP. It connects to the FHE-enabled smart
contract, lets users submit encrypted registrations, triggers an on-chain draw, and decrypts the winning ciphertext
directly in the browser.

## Highlights

- **RainbowKit + Wagmi** for wallet connection (Metamask, WalletConnect, Coinbase Wallet…).
- **FHEVM integration** via the shared hooks in `@/fhevm` and the custom `useLuckyDraw` hook.
- **Tailwind-enhanced UI** that surfaces encrypted states, winner information, and operational logs.
- **In-memory decryption signatures** so that users can decrypt handles without leaking private keys.

## Getting Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Generate ABI metadata (reads from `../deployments`)

   ```bash
   npm run genabi
   ```

3. Start the development server (mock mode targets the local Hardhat FHEVM node)

   ```bash
   npm run dev:mock
   ```

4. Open `http://localhost:3000` and connect your wallet using the RainbowKit button in the header.

## Environment Variables

- `NEXT_PUBLIC_WALLETCONNECT_ID` – optional WalletConnect project id. When omitted, a placeholder value is used for local
  testing.

## Scripts

| Script               | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `npm run dev`        | Generate ABI and start Next.js (targets configured RPC)                     |
| `npm run dev:mock`   | Same as above but warns if the local Hardhat node is not available          |
| `npm run build`      | Production build                                                             |
| `npm run start`      | Serve the production build                                                   |
| `npm run lint`       | Run Next.js + ESLint checks                                                  |
| `npm run genabi`     | Recreate `abi/EncryptedLuckyDraw*.ts` from hardhat-deploy artifacts          |

## Project Structure

- `app/` – Next.js App Router entrypoints, including `providers.tsx` where RainbowKit + Wagmi + MetaMask hooks are wired
  together.
- `components/EncryptedLuckyDrawDashboard.tsx` – main UI for the registration, draw, and decryption lifecycle.
- `hooks/useLuckyDraw.tsx` – orchestrates contract reads/writes, encrypted input creation, and decryption.
- `fhevm/` – shared logic to bootstrap an FHEVM instance and manage decryption signatures.

## Development Tips

- The dashboard expects the contract address/ABI in `abi/EncryptedLuckyDrawAddresses.ts`. Regenerate this file (via
  `npm run genabi`) after redeploying contracts.
- Running the UI against Sepolia requires that you deploy the contract and set `NEXT_PUBLIC_WALLETCONNECT_ID` for
  WalletConnect usage.
- If you change wallets or restart your dev node, reload the page to refresh MetaMask’s local cache.

## License

BSD-3-Clause-Clear – see the root `LICENSE` file for details.
