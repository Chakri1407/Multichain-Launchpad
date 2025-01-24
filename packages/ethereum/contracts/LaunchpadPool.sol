// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";

contract LaunchpadPool is ReentrancyGuard, NonblockingLzApp {
    struct Pool {
        address token;
        uint256 tokenPrice;
        uint256 softCap;
        uint256 hardCap;
        uint256 startTime;
        uint256 endTime;
        bool finalized;
    }

    struct VestingSchedule {
        uint256 startTime;
        uint256 cliff;
        uint256 duration;
        uint256 totalAmount;
        uint256 claimedAmount;
    }

    mapping(uint256 => Pool) public pools;
    mapping(address => mapping(uint256 => uint256)) public investments;
    mapping(address => mapping(uint256 => VestingSchedule)) public vestingSchedules;
    
    uint256 public poolCount;

    event PoolCreated(uint256 indexed poolId, address token, uint256 tokenPrice);
    event InvestmentMade(uint256 indexed poolId, address investor, uint256 amount);
    event TokensClaimed(uint256 indexed poolId, address investor, uint256 amount);

    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {}

    function createPool(
        address _token,
        uint256 _tokenPrice,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _startTime,
        uint256 _endTime
    ) external {
        require(_token != address(0), "Invalid token address");
        require(_tokenPrice > 0, "Invalid token price");
        require(_startTime > block.timestamp, "Invalid start time");
        require(_endTime > _startTime, "Invalid end time");

        pools[poolCount] = Pool({
            token: _token,
            tokenPrice: _tokenPrice,
            softCap: _softCap,
            hardCap: _hardCap,
            startTime: _startTime,
            endTime: _endTime,
            finalized: false
        });

        emit PoolCreated(poolCount, _token, _tokenPrice);
        poolCount++;
    }

    function invest(uint256 _poolId) external payable nonReentrant {
        Pool storage pool = pools[_poolId];
        require(block.timestamp >= pool.startTime, "Pool not started");
        require(block.timestamp <= pool.endTime, "Pool ended");
        require(!pool.finalized, "Pool finalized");
        
        uint256 tokenAmount = (msg.value * 1e18) / pool.tokenPrice;
        investments[msg.sender][_poolId] += msg.value;
        
        // Create vesting schedule
        vestingSchedules[msg.sender][_poolId] = VestingSchedule({
            startTime: pool.endTime,
            cliff: 30 days,
            duration: 180 days,
            totalAmount: tokenAmount,
            claimedAmount: 0
        });

        emit InvestmentMade(_poolId, msg.sender, msg.value);
    }

    function claimTokens(uint256 _poolId) external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[msg.sender][_poolId];
        require(block.timestamp >= schedule.startTime + schedule.cliff, "Cliff period not over");
        
        uint256 elapsedTime = block.timestamp - schedule.startTime;
        uint256 vestedAmount;
        
        if (elapsedTime >= schedule.duration) {
            vestedAmount = schedule.totalAmount;
        } else {
            vestedAmount = (schedule.totalAmount * elapsedTime) / schedule.duration;
        }
        
        uint256 claimableAmount = vestedAmount - schedule.claimedAmount;
        require(claimableAmount > 0, "No tokens to claim");
        
        schedule.claimedAmount += claimableAmount;
        IERC20(pools[_poolId].token).transfer(msg.sender, claimableAmount);
        
        emit TokensClaimed(_poolId, msg.sender, claimableAmount);
    }

    // LayerZero implementation
    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal override {
        // Handle cross-chain messages
        (uint256 poolId, address investor, uint256 amount) = abi.decode(
            _payload,
            (uint256, address, uint256)
        );
        
        // Process cross-chain investment
        _handleCrossChainInvestment(poolId, investor, amount);
    }

    function _handleCrossChainInvestment(
        uint256 _poolId,
        address _investor,
        uint256 _amount
    ) internal {
        Pool storage pool = pools[_poolId];
        require(block.timestamp >= pool.startTime, "Pool not started");
        require(block.timestamp <= pool.endTime, "Pool ended");
        require(!pool.finalized, "Pool finalized");
        
        uint256 tokenAmount = (_amount * 1e18) / pool.tokenPrice;
        investments[_investor][_poolId] += _amount;
        
        vestingSchedules[_investor][_poolId] = VestingSchedule({
            startTime: pool.endTime,
            cliff: 30 days,
            duration: 180 days,
            totalAmount: tokenAmount,
            claimedAmount: 0
        });

        emit InvestmentMade(_poolId, _investor, _amount);
    }

    function finalizePool(uint256 _poolId) external {
        Pool storage pool = pools[_poolId];
        require(block.timestamp > pool.endTime, "Pool not ended");
        require(!pool.finalized, "Pool already finalized");
        
        uint256 totalRaised = getTotalRaised(_poolId);
        require(totalRaised >= pool.softCap, "Softcap not reached");
        
        pool.finalized = true;
    }

    function getTotalRaised(uint256 _poolId) public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < poolCount; i++) {
            total += investments[msg.sender][_poolId];
        }
        return total;
    }

    function getPool(uint256 _poolId) external view returns (Pool memory) {
        return pools[_poolId];
    }

    function getVestingSchedule(address _investor, uint256 _poolId) 
        external 
        view 
        returns (VestingSchedule memory) 
    {
        return vestingSchedules[_investor][_poolId];
    }

    function getInvestment(address _investor, uint256 _poolId) 
        external 
        view 
        returns (uint256) 
    {
        return investments[_investor][_poolId];
    }
}
