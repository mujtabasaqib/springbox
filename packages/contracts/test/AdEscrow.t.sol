// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AdEscrow} from "../src/AdEscrow.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockUSDCPermit} from "./mocks/MockUSDCPermit.sol";

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

        // ---------- Flow D: permit funding (one tx) ----------

    function _signPermit(MockUSDCPermit t, uint256 pk, address owner_, address spender, uint256 value, uint256 deadline)
        internal
        view
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner_,
                spender,
                value,
                t.nonces(owner_),
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", t.DOMAIN_SEPARATOR(), structHash));
        (v, r, s) = vm.sign(pk, digest);
    }

    function test_CreateCampaignWithPermit_SingleTx() public {
        MockUSDCPermit pusdc = new MockUSDCPermit();
        AdEscrow pescrow = new AdEscrow(IERC20(address(pusdc)), operator, MIN_CLAIM);
        (address adv, uint256 pk) = makeAddrAndKey("permitAdvertiser");
        pusdc.mint(adv, BUDGET);

        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(pusdc, pk, adv, address(pescrow), BUDGET, deadline);

        vm.prank(adv);
        uint256 id = pescrow.createCampaignWithPermit(BUDGET, deadline, v, r, s);

        assertEq(id, 1);
        assertEq(pusdc.balanceOf(address(pescrow)), BUDGET);
        assertEq(pescrow.totalDeposited(), BUDGET);
    }

    function test_CreateCampaignWithPermit_SurvivesFrontRunPermit() public {
        MockUSDCPermit pusdc = new MockUSDCPermit();
        AdEscrow pescrow = new AdEscrow(IERC20(address(pusdc)), operator, MIN_CLAIM);
        (address adv, uint256 pk) = makeAddrAndKey("permitAdvertiser");
        pusdc.mint(adv, BUDGET);

        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(pusdc, pk, adv, address(pescrow), BUDGET, deadline);

        // someone else submits the permit first; the funding call must still succeed
        vm.prank(stranger);
        pusdc.permit(adv, address(pescrow), BUDGET, deadline, v, r, s);

        vm.prank(adv);
        pescrow.createCampaignWithPermit(BUDGET, deadline, v, r, s);
        assertEq(pusdc.balanceOf(address(pescrow)), BUDGET);
    }

    // ---------- Flow E: refund of unspent budget ----------

    function test_Refund_ReturnsUnspentToAdvertiser() public {
        _fund();
        _publish(0, 100e6); // 100 USDC promised to creators

        uint256 unspent = BUDGET - 100e6;

        vm.expectEmit(true, true, false, true);
        emit AdEscrow.Refunded(1, advertiser, unspent);
        vm.prank(operator);
        escrow.refund(1, advertiser, unspent);

        assertEq(usdc.balanceOf(advertiser), unspent);
        assertEq(escrow.totalDeposited(), 100e6);
        assertEq(usdc.balanceOf(address(escrow)), 100e6);
    }

    function test_Refund_OnlyOperator() public {
        _fund();
        vm.prank(stranger);
        vm.expectRevert(AdEscrow.NotOperator.selector);
        escrow.refund(1, advertiser, 1e6);
    }

    function test_Refund_CannotDipIntoAllocated() public {
        _fund();
        _publish(0, 100e6);

        // one unit more than the unallocated remainder
        vm.prank(operator);
        vm.expectRevert(AdEscrow.RefundExceedsUnallocated.selector);
        escrow.refund(1, advertiser, BUDGET - 100e6 + 1);
    }

    function test_Refund_RejectsZeroAndUnknownCampaign() public {
        _fund();

        vm.startPrank(operator);
        vm.expectRevert(AdEscrow.ZeroAmount.selector);
        escrow.refund(1, advertiser, 0);

        vm.expectRevert(AdEscrow.UnknownCampaign.selector);
        escrow.refund(2, advertiser, 1e6);

        vm.expectRevert(AdEscrow.UnknownCampaign.selector);
        escrow.refund(0, advertiser, 1e6);
        vm.stopPrank();
    }

    function test_Refund_CreatorStillClaimsInFull() public {
        _fund();
        (bytes32 viewerLeaf,) = _publish(0, 100e6);

        vm.prank(operator);
        escrow.refund(1, advertiser, BUDGET - 100e6);

        vm.prank(creator);
        escrow.claim(100e6, _proof(viewerLeaf));
        assertEq(usdc.balanceOf(creator), 100e6);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_Refund_LowersCapForFutureEpochs() public {
        _fund();
        _publish(0, 100e6);

        vm.prank(operator);
        escrow.refund(1, advertiser, BUDGET - 100e6);

        // deposits are now 100 USDC, so allocating more than that reverts
        vm.prank(operator);
        vm.expectRevert(AdEscrow.OverAllocated.selector);
        escrow.publishEpoch(bytes32(uint256(1)), 100e6 + 1);
    }
}