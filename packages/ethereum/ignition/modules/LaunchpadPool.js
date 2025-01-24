const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const LaunchpadPoolModule = buildModule("LaunchpadPoolModule", (m) => {
  // Deploy mock token for testing (optional, can be replaced with actual token address)
  const mockToken = m.contract("MockToken", ["Test Token", "TEST", ethers.utils.parseEther("1000000")]);

  // Configuration for different networks
  const layerZeroEndpoints = {
    sepolia: "0x...", // LayerZero endpoint for Sepolia 
  };

  // Deploy LaunchpadPool with LayerZero endpoint
  const launchpadPool = m.contract("LaunchpadPool", [
    // Use network-specific LayerZero endpoint
    process.env.NETWORK === 'sepolia' 
      ? layerZeroEndpoints.sepolia 
      : layerZeroEndpoints.mumbai
  ], {
    // Optional: make the deployment upgradeable
    proxy: {
      proxyType: 'UUPS',
      initializer: 'initialize'
    }
  });

  // Optional: Transfer tokens to the pool
  m.call(mockToken, "transfer", [
    launchpadPool.address, 
    ethers.utils.parseEther("500000")
  ]);

  return { mockToken, launchpadPool };
});

module.exports = LaunchpadPoolModule;