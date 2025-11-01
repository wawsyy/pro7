import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, deployments, fhevm } from "hardhat";

import { EncryptedLuckyDraw } from "../types";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("EncryptedLuckyDrawSepolia", function () {
  let contract: EncryptedLuckyDraw;
  let contractAddress: string;
  let signers: Signers;

  before(async function () {
    if (fhevm.isMock) {
      console.warn("This test suite is only intended for Sepolia execution.");
      this.skip();
    }

    try {
      const deployment = await deployments.get("EncryptedLuckyDraw");
      contractAddress = deployment.address;
      contract = await ethers.getContractAt("EncryptedLuckyDraw", deployment.address);
    } catch (error) {
      (error as Error).message += ". Call 'npx hardhat deploy --network sepolia' first.";
      throw error;
    }

    const [alice] = await ethers.getSigners();
    signers = { alice };
  });

  it("reads encrypted lucky draw state without mutating it", async function () {
    this.timeout(120_000);

    const participantCount = await contract.getParticipantsCount();
    expect(participantCount).to.be.gte(0n);

    if (participantCount > 0n) {
      const first = await contract.getParticipantAccount(0);
      expect(first).to.be.properAddress;
    }

    try {
      await contract.getEncryptedWinnerIndex();
    } catch (error) {
      // no winner selected yet is acceptable on Sepolia
      expect((error as Error).message).to.match(/No winner yet/);
    }
  });
});
