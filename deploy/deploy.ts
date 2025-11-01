import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedLuckyDraw = await deploy("EncryptedLuckyDraw", {
    from: deployer,
    log: true,
  });

  console.log(`EncryptedLuckyDraw contract: `, deployedLuckyDraw.address);
};
export default func;
func.id = "deploy_encryptedLuckyDraw"; // id required to prevent reexecution
func.tags = ["EncryptedLuckyDraw"];
