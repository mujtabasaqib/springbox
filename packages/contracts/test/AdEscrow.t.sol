// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AdEscrow} from "../src/AdEscrow.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract AdEscrowTest is Test {
    MockUSDC usdc;
    AdEscrow escrow;

    address advertiser = makeAddr("advertiser");
    address operator = makeAddr("operator");
    address creator = makeAddr("creator");
    address viewer = makeAddr("viewer");
    address stranger = makeAddr("stranger");

    uint256 constant BUDGET = 1_000e6; // 1,000 USDC (6 decimals)
    uint256 constant MIN_CLAIM = 5e6; // 5 USDC

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new AdEscrow(IERC20(address(usdc)), operator, MIN_CLAIM);
        usdc.mint(advertiser, BUDGET);
    }

    // ---------- helpers ----------

    function _fund() internal {
        vm.startPrank(advertiser);
        usdc.approve(address(escrow), BUDGET);
        escrow.createCampaign(BUDGET);
        vm.stopPrank();
    }

    function _leaf(address account, uint256 cumulative) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(account, cumulative))));
    }

    /// Two-leaf tree (OpenZeppelin sorted-pair hashing). Each leaf's proof is the other leaf.
    function _root(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    /// Operator publishes a root for cumulative totals of viewer and creator.
    function _publish(uint256 viewerTotal, uint256 creatorTotal)
        internal
        returns (bytes32 viewerLeaf, bytes32 creatorLeaf)
    {
        viewerLeaf = _leaf(viewer, viewerTotal);
        creatorLeaf = _leaf(creator, creatorTotal);
        vm.prank(operator);
        escrow.publishEpoch(_root(viewerLeaf, creatorLeaf), viewerTotal + creatorTotal);
    }

    function _proof(bytes32 otherLeaf) internal pure returns (bytes32[] memory p) {
        p = new bytes32[](1);
        p[0] = otherLeaf;
    }

    // ---------- Flow A: funding ----------

    function test_CreateCampaign_LocksFundsInEscrow() public {
        vm.startPrank(advertiser);
        usdc.approve(address(escrow), BUDGET);

        vm.expectEmit(true, true, false, true);
        emit AdEscrow.CampaignFunded(1, advertiser, BUDGET);
        escrow.createCampaign(BUDGET);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(escrow)), BUDGET);
        assertEq(usdc.balanceOf(advertiser), 0);
        assertEq(escrow.totalDeposited(), BUDGET);
    }

    // ---------- Safety: operator + cap ----------

    function test_PublishEpoch_OnlyOperatorAndCappedByDeposits() public {
        _fund();

        // non-operator cannot publish
        vm.prank(stranger);
        vm.expectRevert(AdEscrow.NotOperator.selector);
        escrow.publishEpoch(bytes32(uint256(1)), 10e6);

        // operator cannot promise more than was deposited
        vm.prank(operator);
        vm.expectRevert(AdEscrow.OverAllocated.selector);
        escrow.publishEpoch(bytes32(uint256(1)), BUDGET + 1);
    }

    // ---------- Flow B: creator claim ----------

    function test_Creator_ClaimsWithValidProof() public {
        _fund();
        (bytes32 viewerLeaf,) = _publish(2e6, 100e6);

        vm.prank(creator);
        escrow.claim(100e6, _proof(viewerLeaf));
        assertEq(usdc.balanceOf(creator), 100e6);

        // claiming the same root again pays nothing
        vm.prank(creator);
        vm.expectRevert(AdEscrow.NothingToClaim.selector);
        escrow.claim(100e6, _proof(viewerLeaf));

        // inflated amount fails proof verification
        vm.prank(creator);
        vm.expectRevert(AdEscrow.InvalidProof.selector);
        escrow.claim(200e6, _proof(viewerLeaf));
    }

    // ---------- Flow C: viewer threshold ----------

    function test_Viewer_ClaimBelowThresholdReverts() public {
        _fund();
        (, bytes32 creatorLeaf) = _publish(2e6, 100e6); // viewer earned 2 USDC < 5 USDC min

        vm.prank(viewer);
        vm.expectRevert(AdEscrow.BelowMinClaim.selector);
        escrow.claim(2e6, _proof(creatorLeaf));

        assertEq(usdc.balanceOf(viewer), 0);
    }

    // ---------- Batching across epochs ----------

    function test_SecondEpoch_PaysOnlyTheDelta() public {
        _fund();

        // epoch 1: viewer has earned 10 USDC total
        (, bytes32 creatorLeaf1) = _publish(10e6, 20e6);
        vm.prank(viewer);
        escrow.claim(10e6, _proof(creatorLeaf1));
        assertEq(usdc.balanceOf(viewer), 10e6);

        // epoch 2: cumulative total grows to 25 USDC, so only 15 is newly payable
        (, bytes32 creatorLeaf2) = _publish(25e6, 30e6);
        vm.prank(viewer);
        escrow.claim(25e6, _proof(creatorLeaf2));

        assertEq(usdc.balanceOf(viewer), 25e6);
        assertEq(escrow.claimed(viewer), 25e6);
    }
}