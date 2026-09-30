// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract AdEscrow {
    using SafeERC20 for IERC20;

    // ---- errors ----
    error NotOperator();
    error OverAllocated();
    error NothingToClaim();
    error BelowMinClaim();
    error InvalidProof();
    error ZeroAmount();
    error AllocationDecreased();

    // ---- events ----
    event CampaignFunded(uint256 indexed campaignId, address indexed advertiser, uint256 budget);
    event EpochPublished(uint256 indexed epoch, bytes32 root, uint256 totalAllocated);
    event Claimed(address indexed account, uint256 amount);

    // ---- state ----
    IERC20 public immutable token;
    address public immutable operator;
    uint256 public immutable minClaim;

    uint256 public campaignCount; // ids start at 1
    uint256 public totalDeposited;
    uint256 public totalAllocated; // cumulative amount promised by the latest root
    uint256 public epoch;
    bytes32 public merkleRoot;
    mapping(address => uint256) public claimed;

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    constructor(IERC20 _token, address _operator, uint256 _minClaim) {
        token = _token;
        operator = _operator;
        minClaim = _minClaim;
    }

    /// Advertiser deposits `budget` (caller must have approved). Returns the new campaign id.
    function createCampaign(uint256 budget) external returns (uint256 campaignId) {
        if (budget == 0) revert ZeroAmount();

        campaignId = ++campaignCount;
        totalDeposited += budget;

        token.safeTransferFrom(msg.sender, address(this), budget);

        emit CampaignFunded(campaignId, msg.sender, budget);
    }

    /// Operator replaces the root. `_totalAllocated` is cumulative and must be <= totalDeposited.
    function publishEpoch(bytes32 root, uint256 _totalAllocated) external onlyOperator {
        if (_totalAllocated > totalDeposited) revert OverAllocated();
        if (_totalAllocated < totalAllocated) revert AllocationDecreased();

        merkleRoot = root;
        totalAllocated = _totalAllocated;
        uint256 newEpoch = ++epoch;

        emit EpochPublished(newEpoch, root, _totalAllocated);
    }

    /// Pays `cumulativeAmount - claimed[msg.sender]`.
    /// Leaf = keccak256(bytes.concat(keccak256(abi.encode(account, cumulativeAmount)))).
    function claim(uint256 cumulativeAmount, bytes32[] calldata proof) external {
        // 1. the (account, cumulative) pair must be in the current root
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, cumulativeAmount))));
        if (!MerkleProof.verifyCalldata(proof, merkleRoot, leaf)) revert InvalidProof();

        // 2. only the delta since the last claim is payable
        uint256 alreadyClaimed = claimed[msg.sender];
        if (cumulativeAmount <= alreadyClaimed) revert NothingToClaim();
        uint256 payable_ = cumulativeAmount - alreadyClaimed;

        // 3. batching threshold
        if (payable_ < minClaim) revert BelowMinClaim();

        // effects before interaction
        claimed[msg.sender] = cumulativeAmount;

        token.safeTransfer(msg.sender, payable_);

        emit Claimed(msg.sender, payable_);
    }
}