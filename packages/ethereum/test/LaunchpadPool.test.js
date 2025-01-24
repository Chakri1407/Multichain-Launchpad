const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("LaunchpadPool", function () {
  let launchpadPool;
  let mockToken;
  let owner;
  let investor1;
  let investor2;

  beforeEach(async function () {
    // Get signers
    [owner, investor1, investor2] = await ethers.getSigners();

    // Deploy mock token
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    mockToken = await MockTokenFactory.deploy(
      "Test Token", 
      "TEST", 
      ethers.utils.parseEther("1000000")
    );
    await mockToken.deployed();

    // Deploy LaunchpadPool
    const LaunchpadPoolFactory = await ethers.getContractFactory("LaunchpadPool");
    launchpadPool = await upgrades.deployProxy(
      LaunchpadPoolFactory, 
      [ethers.constants.AddressZero], 
      { kind: "uups" }
    );
    await launchpadPool.deployed();

    // Prepare token for pool
    await mockToken.transfer(launchpadPool.address, ethers.utils.parseEther("500000"));
  });

  describe("Pool Creation", function () {
    it("Should create a fundraising pool", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const tx = await launchpadPool.createPool(
        mockToken.address,
        ethers.utils.parseEther("0.1"),  // Token price
        ethers.utils.parseEther("10000"),  // Soft cap
        ethers.utils.parseEther("50000"),  // Hard cap
        currentTime,
        currentTime + 30 * 24 * 60 * 60  // 30 days from now
      );

      const receipt = await tx.wait();
      const poolCreatedEvent = receipt.events?.find(
        event => event.event === "PoolCreated"
      );

      expect(poolCreatedEvent).to.exist;
      expect(poolCreatedEvent?.args?.token).to.equal(mockToken.address);
    });
  });

  describe("Investment", function () {
    let poolId;

    beforeEach(async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      await launchpadPool.createPool(
        mockToken.address,
        ethers.utils.parseEther("0.1"),
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("50000"),
        currentTime,
        currentTime + 30 * 24 * 60 * 60
      );
      poolId = 0;  // First pool
    });

    it("Should allow investment in the pool", async function () {
      const investmentAmount = ethers.utils.parseEther("1");
      
      await expect(
        launchpadPool.connect(investor1).invest(poolId, { value: investmentAmount })
      ).to.emit(launchpadPool, "InvestmentMade")
      .withArgs(poolId, investor1.address, investmentAmount);

      const userInvestment = await launchpadPool.investments(
        investor1.address, 
        poolId
      );
      expect(userInvestment).to.equal(investmentAmount);
    });

    it("Should prevent investment outside pool timeline", async function () {
      // Fast forward past pool end time
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const investmentAmount = ethers.utils.parseEther("1");
      
      await expect(
        launchpadPool.connect(investor1).invest(poolId, { value: investmentAmount })
      ).to.be.revertedWith("Pool ended");
    });
  });

  describe("Token Vesting", function () {
    let poolId;

    beforeEach(async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      await launchpadPool.createPool(
        mockToken.address,
        ethers.utils.parseEther("0.1"),
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("50000"),
        currentTime,
        currentTime + 30 * 24 * 60 * 60
      );
      poolId = 0;  // First pool

      // Invest
      const investmentAmount = ethers.utils.parseEther("1");
      await launchpadPool.connect(investor1).invest(poolId, { value: investmentAmount });
    });

    it("Should implement linear vesting", async function () {
      // Fast forward past cliff period
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      // Claim tokens
      await expect(
        launchpadPool.connect(investor1).claimTokens(poolId)
      ).to.emit(launchpadPool, "TokensClaimed");

      // Verify claimed amount
      const vestingSchedule = await launchpadPool.vestingSchedules(investor1.address, poolId);
      expect(vestingSchedule.claimedAmount).to.be.gt(0);
    });

    it("Should prevent early token claims", async function () {
      // Try to claim before cliff period
      await expect(
        launchpadPool.connect(investor1).claimTokens(poolId)
      ).to.be.revertedWith("Cliff period not over");
    });
  });

  describe("Governance Voting", function () {
    it("Should allow governance voting", async function () {
      // Create proposal
      const proposalTx = await launchpadPool.createProposal(
        "Test Proposal",
        "Description of the proposal"
      );
      const receipt = await proposalTx.wait();
      const proposalId = receipt.events?.find(
        event => event.event === "ProposalCreated"
      )?.args?.proposalId;

      // Vote on proposal
      await launchpadPool.connect(investor1).vote(proposalId, true);

      // Check vote
      const vote = await launchpadPool.getVote(proposalId, investor1.address);
      expect(vote).to.be.true;
    });
  });
});