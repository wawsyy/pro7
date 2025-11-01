import { FhevmType } from "@fhevm/hardhat-plugin";
import { keccak256, toUtf8Bytes } from "ethers";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

const NAME_MASK = (1n << 64n) - 1n;

const computeNameFingerprint = (name: string): bigint => {
  const hash = keccak256(toUtf8Bytes(name));
  return BigInt(hash) & NAME_MASK;
};

task("task:address", "Print the EncryptedLuckyDraw deployment address").setAction(
  async function (_taskArguments: TaskArguments, hre) {
    const { deployments } = hre;
    const contract = await deployments.get("EncryptedLuckyDraw");
    console.log(`EncryptedLuckyDraw is deployed at ${contract.address}`);
  },
);

task("task:register", "Register a participant using an encrypted name fingerprint")
  .addParam("name", "Plaintext display name that will be fingerprinted locally before encryption")
  .addOptionalParam("address", "Optionally specify a deployed EncryptedLuckyDraw contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, fhevm, ethers } = hre;
    const [signer] = await ethers.getSigners();

    await fhevm.initializeCLIApi();
    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedLuckyDraw");
    const fingerprint = computeNameFingerprint(taskArguments.name);

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, signer.address)
      .add64(fingerprint)
      .encrypt();

    const contract = await ethers.getContractAt("EncryptedLuckyDraw", deployment.address);
    const tx = await contract
      .connect(signer)
      .registerParticipant(encryptedInput.handles[0], encryptedInput.inputProof);
    console.log(`Waiting for tx: ${tx.hash} ...`);
    const receipt = await tx.wait();
    console.log(`tx status = ${receipt?.status}`);
  });

task("task:draw", "Trigger an encrypted lucky draw")
  .addOptionalParam("address", "Optionally specify a deployed EncryptedLuckyDraw contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers } = hre;
    const [signer] = await ethers.getSigners();
    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedLuckyDraw");
    const contract = await ethers.getContractAt("EncryptedLuckyDraw", deployment.address);
    const tx = await contract.connect(signer).drawWinner();
    console.log(`Waiting for tx: ${tx.hash} ...`);
    const receipt = await tx.wait();
    console.log(`Winner index (plaintext) from events may be inspected via receipt logs.`);
    console.log(`tx status = ${receipt?.status}`);
  });

task("task:winner-index", "Decrypt the encrypted winner index")
  .addOptionalParam("address", "Optionally specify a deployed EncryptedLuckyDraw contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, fhevm, ethers } = hre;
    const [signer] = await ethers.getSigners();
    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedLuckyDraw");

    const contract = await ethers.getContractAt("EncryptedLuckyDraw", deployment.address);
    const encryptedIndex = await contract.getEncryptedWinnerIndex();

    const clearIndex = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedIndex,
      deployment.address,
      signer,
    );
    console.log(`Encrypted winner index: ${encryptedIndex}`);
    console.log(`Decrypted winner index: ${clearIndex}`);
  });

task("task:winner-name", "Decrypt the encrypted winner fingerprint")
  .addOptionalParam("address", "Optionally specify a deployed EncryptedLuckyDraw contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, fhevm, ethers } = hre;
    const [signer] = await ethers.getSigners();
    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedLuckyDraw");

    const contract = await ethers.getContractAt("EncryptedLuckyDraw", deployment.address);
    const encryptedName = await contract.getEncryptedWinnerName();

    const clearFingerprint = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedName,
      deployment.address,
      signer,
    );
    console.log(`Encrypted winner fingerprint: ${encryptedName}`);
    console.log(`Decrypted winner fingerprint (uint64): ${clearFingerprint}`);
  });
