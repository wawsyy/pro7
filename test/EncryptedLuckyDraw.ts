import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

import { EncryptedLuckyDraw, EncryptedLuckyDraw__factory } from "../types";

const NAME_MASK = (1n << 64n) - 1n;

const fingerprint = (name: string): bigint => {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(name));
  return BigInt(hash) & NAME_MASK;
};

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedLuckyDraw")) as EncryptedLuckyDraw__factory;
  const contract = (await factory.deploy()) as EncryptedLuckyDraw;
  const address = await contract.getAddress();

  return { contract, address };
}

describe("EncryptedLuckyDraw", function () {
  let signers: Signers;
  let contract: EncryptedLuckyDraw;
  let contractAddress: string;

  before(async function () {
    const accounts: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: accounts[0], alice: accounts[1], bob: accounts[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This Hardhat test suite only runs in the local mock FHEVM");
      this.skip();
    }

    ({ contract, address: contractAddress } = await deployFixture());
  });

  const encryptName = async (name: string, signer: HardhatEthersSigner) => {
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signer.address)
      .add64(fingerprint(name))
      .encrypt();
    return encryptedInput;
  };

  it("requires at least two participants before drawing", async function () {
    const aliceInput = await encryptName("Alice", signers.alice);

    await expect(
      contract.connect(signers.alice).registerParticipant(aliceInput.handles[0], aliceInput.inputProof),
    ).to.not.be.reverted;

    await expect(contract.drawWinner()).to.be.revertedWith("Need at least two participants");
  });

  it("stores encrypted participants and publishes encrypted winner details", async function () {
    const aliceInput = await encryptName("Alice", signers.alice);
    const bobInput = await encryptName("Bob", signers.bob);

    await contract.connect(signers.alice).registerParticipant(aliceInput.handles[0], aliceInput.inputProof);
    await contract.connect(signers.bob).registerParticipant(bobInput.handles[0], bobInput.inputProof);

    expect(await contract.getParticipantsCount()).to.eq(2);

    const drawTx = await contract.connect(signers.deployer).drawWinner();
    await drawTx.wait();

    const encryptedIndex = await contract.getEncryptedWinnerIndex();
    const decryptedIndex = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedIndex,
      contractAddress,
      signers.alice,
    );
    const normalizedIndex = BigInt(decryptedIndex);
    expect([0n, 1n]).to.include(normalizedIndex);

    const encryptedName = await contract.getEncryptedWinnerName();

    const decryptedNameAlice = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedName,
      contractAddress,
      signers.alice,
    );
    const decryptedNameBob = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedName,
      contractAddress,
      signers.bob,
    );

    const aliceFingerprint = fingerprint("Alice");
    const bobFingerprint = fingerprint("Bob");

    const winnerAccount = await contract.getWinnerAccount();
    expect([signers.alice.address, signers.bob.address]).to.include(winnerAccount);

    if (winnerAccount === signers.alice.address) {
      expect(BigInt(decryptedNameAlice)).to.eq(aliceFingerprint);
    } else {
      expect(BigInt(decryptedNameBob)).to.eq(bobFingerprint);
    }
  });

  it("clears winner state when a new participant joins", async function () {
    const aliceInput = await encryptName("Alice", signers.alice);
    const bobInput = await encryptName("Bob", signers.bob);

    await contract.connect(signers.alice).registerParticipant(aliceInput.handles[0], aliceInput.inputProof);
    await contract.connect(signers.bob).registerParticipant(bobInput.handles[0], bobInput.inputProof);

    await (await contract.drawWinner()).wait();

    const charlie = signers.deployer;
    const charlieInput = await encryptName("Charlie", charlie);
    await contract.connect(charlie).registerParticipant(charlieInput.handles[0], charlieInput.inputProof);

    await expect(contract.getEncryptedWinnerIndex()).to.be.revertedWith("No winner yet");
  });
});
