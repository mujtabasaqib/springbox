// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AdEscrow} from "../src/AdEscrow.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        uint256 minClaim = vm.envOr("MIN_CLAIM", uint256(5e6));
        address usdc = vm.envOr("USDC_ADDRESS", address(0));
        address fundTo = vm.envOr("FUND_ADDRESS", address(0));

        vm.startBroadcast(pk);

        // No real USDC configured, so deploy the mock and mint test funds.
        if (usdc == address(0)) {
            MockUSDC mock = new MockUSDC();
            usdc = address(mock);
            if (fundTo != address(0)) mock.mint(fundTo, 10_000e6);
        }

        AdEscrow escrow = new AdEscrow(IERC20(usdc), operator, minClaim);

        vm.stopBroadcast();

        // Write addresses for backend/frontend to read.
        string memory k = "deployment";
        vm.serializeUint(k, "chainId", block.chainid);
        vm.serializeAddress(k, "usdc", usdc);
        vm.serializeAddress(k, "operator", operator);
        string memory json = vm.serializeAddress(k, "escrow", address(escrow));
        vm.writeJson(json, string.concat("./deployments/", vm.toString(block.chainid), ".json"));
    }
}