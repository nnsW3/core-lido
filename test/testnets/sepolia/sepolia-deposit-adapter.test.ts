import { expect } from "chai";
import { ZeroAddress } from "ethers";
import { ethers } from "hardhat";

import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { ISepoliaDepositContract, SepoliaDepositAdapter } from "typechain-types";

import { ether, findEvents } from "lib";

import { Snapshot } from "test/suite";

describe("SepoliaDepositAdapter.sol", () => {
    let originalState: string;

    let owner: HardhatEthersSigner;
    let user: HardhatEthersSigner;
    let depositAdapter: SepoliaDepositAdapter;
    let depositAdapterAddress: string;
    let bepoliaToken: ISepoliaDepositContract;
    const sepoliaDepositContractAddress = "0x7f02C3E3c98b133055B8B348B2Ac625669Ed295D";
    const EOAddress = "0x6885E36BFcb68CB383DfE90023a462C03BCB2AE5";
    const bepoliaTokenHolder = EOAddress;
    // const log = console.log;
    const log = (...data: unknown[]) => {
        data;
    };

    before(async function () {
        const { chainId } = await ethers.provider.getNetwork();
        log("chainId", chainId);
        if (chainId !== 11155111n) {
            return this.skip();
        }

        [owner, user] = await ethers.getSigners();

        depositAdapter = await ethers.deployContract("SepoliaDepositAdapter");
        depositAdapterAddress = await depositAdapter.getAddress();
        log("depositAdapter address", depositAdapterAddress);

        bepoliaToken = await ethers.getContractAt("ISepoliaDepositContract", sepoliaDepositContractAddress);

        const code = await ethers.provider.getCode(depositAdapterAddress);
        expect(code).to.not.equal("0x");
    });

    beforeEach(async () => (originalState = await Snapshot.take()));

    afterEach(async () => await Snapshot.restore(originalState));

    context("DespositAdapter", () => {
        it("recover Bepolia tokens", async () => {
            const BEPOLIA_TO_TRANSFER = 2n;
            const bepoliaHolderInitialBalance = await bepoliaToken.balanceOf(bepoliaTokenHolder);
            const impersonatedSigner = await ethers.getImpersonatedSigner(bepoliaTokenHolder);

            log("bepoliaHolderInitialBalance", bepoliaHolderInitialBalance);
            await bepoliaToken.connect(impersonatedSigner).transfer(depositAdapterAddress, BEPOLIA_TO_TRANSFER);

            expect(await bepoliaToken.balanceOf(depositAdapterAddress)).to.equal(BEPOLIA_TO_TRANSFER);

            const bepoliaHolderEndBalance = await bepoliaToken.balanceOf(bepoliaTokenHolder);
            expect(bepoliaHolderEndBalance).to.equal(bepoliaHolderInitialBalance - BEPOLIA_TO_TRANSFER);
            log("bepoliaHolderEndBalance", bepoliaHolderEndBalance);

            // Recover Bepolia tokens
            const tx = await depositAdapter.recoverBepolia();
            const receipt = await tx.wait();
            const events = findEvents(receipt!, "BepoliaRecovered");
            expect(events.length).to.greaterThan(0);
            expect(events[0].args.amount).to.equal(BEPOLIA_TO_TRANSFER);

            const bepoliaTokensOnAdapter = await bepoliaToken.balanceOf(depositAdapterAddress);
            expect(bepoliaTokensOnAdapter).to.equal(0);

            const bepoliaTokenHolderEnd = await bepoliaToken.balanceOf(owner.address);
            expect(bepoliaTokenHolderEnd).to.equal(BEPOLIA_TO_TRANSFER);
        });

        it(`call deposit on Adapter`, async () => {
            const key =
                "0x90823dc2e5ab8a52a0b32883ea8451cbe4c921a42ce439f4fb306a90e9f267e463241da7274b6d44c2e4b95ddbcb0ad3";
            const withdrawalCredentials = "0x005bfe00d82068a0c2a6687afaf969dad5a9c663cb492815a65d203885aaf993";
            const sig =
                "0x802899068eb4b37c95d46869947cac42b9c65b90fcb3fde3854c93ad5737800c01e9c82e174c8ed5cc18210bd60a94ea0082a850817b1dddd4096059b6846417b05094c59d3dd7f4028ed9dff395755f9905a88015b0ed200a7ec1ed60c24922";
            const dataRoot = "0x8b09ed1d0fb3b8e3bb8398c6b77ee3d8e4f67c23cb70555167310ef02b06e5f5";

            const balance0ETH = await ethers.provider.getBalance(depositAdapterAddress);
            expect(balance0ETH).to.equal(0);

            const impersonatedSigner = await ethers.getImpersonatedSigner(bepoliaTokenHolder);
            // Transfer 1 Bepolia token to depositCaller
            await bepoliaToken.connect(impersonatedSigner).transfer(depositAdapterAddress, 1);

            const bepoliaTokenHolderBalance = await bepoliaToken.balanceOf(bepoliaTokenHolder);
            const adapterBepoliaBalance = await bepoliaToken.balanceOf(depositAdapterAddress);
            log("bepoliaTokenHolder and adapter balances: ", bepoliaTokenHolderBalance, adapterBepoliaBalance);
            // We need to have exactly 1 Bepolia token in the adapter
            expect(adapterBepoliaBalance).to.equal(1);

            const depositRootBefore = await depositAdapter.get_deposit_root();
            log("depositRoot", depositRootBefore);
            const depositCountBefore = await depositAdapter.get_deposit_count();
            log("depositCount", BigInt(depositCountBefore));

            const tx = await depositAdapter.deposit(key, withdrawalCredentials, sig, dataRoot, {
                from: owner.address,
                value: ether("32"),
            });
            const receipt = await tx.wait();
            const events = findEvents(receipt!, "EthReceived");
            expect(events.length).to.greaterThan(0);
            expect(events[0].args.sender).to.equal(sepoliaDepositContractAddress);
            expect(events[0].args.amount).to.equal(ether("32"));

            const depositEvents = findEvents(receipt!, "DepositEvent");
            expect(depositEvents.length).to.equal(1);
            log("depositEvents", depositEvents);

            expect(depositEvents[0].args.pubkey).to.equal(key);
            expect(depositEvents[0].args.withdrawal_credentials).to.equal(withdrawalCredentials);
            expect(depositEvents[0].args.signature).to.equal(sig);

            const depositRootAfter = await depositAdapter.get_deposit_root();
            log("depositRoot After", depositRootAfter);
            const depositCountAfter = await depositAdapter.get_deposit_count();
            log("depositCount After", BigInt(depositCountAfter));
            expect(depositRootBefore).to.not.equal(depositRootAfter);
            expect(BigInt(depositCountBefore) + 0x100000000000000n).to.equal(BigInt(depositCountAfter));
            const ethAfterDeposit = await ethers.provider.getBalance(depositAdapterAddress);
            log("ethAfterDeposit", ethAfterDeposit.toString());
            expect(ethAfterDeposit).to.equal(0);

            const adapterBepoliaBalanceAfter = await bepoliaToken.balanceOf(depositAdapterAddress);
            expect(adapterBepoliaBalanceAfter).to.equal(0);
        });

        it(`recover ETH`, async () => {
            const ETH_TO_TRANSFER = ether("10");

            const balance0ETH = await ethers.provider.getBalance(depositAdapterAddress);
            expect(balance0ETH).to.equal(0);

            await owner.sendTransaction({
                to: depositAdapterAddress,
                value: ETH_TO_TRANSFER,
            });

            const ethAfterDeposit = await ethers.provider.getBalance(depositAdapterAddress);
            log("ethAfterDeposit", ethAfterDeposit.toString());
            expect(ethAfterDeposit).to.equal(ETH_TO_TRANSFER);

            const tx = await depositAdapter.recoverEth();
            const receipt = await tx.wait();
            const events = findEvents(receipt!, "EthRecovered");
            expect(events.length).to.greaterThan(0);
            expect(events[0].args.amount).to.equal(ETH_TO_TRANSFER);

            const balanceEthAfterRecover = await ethers.provider.getBalance(depositAdapterAddress);
            log("balanceEthAfterRecover", balanceEthAfterRecover.toString());
            expect(balanceEthAfterRecover).to.equal(0);
        });
    });

    context("DespositAdapter proxy", () => {
        it("works behind proxy", async () => {
            const proxy = await ethers.deployContract("OssifiableProxy", [
                depositAdapterAddress,
                owner.address,
                new Uint8Array(),
            ]);

            const proxyAddress = await proxy.getAddress();
            log("proxyAddress", proxyAddress);

            const proxiedAdapter = await ethers.getContractAt("SepoliaDepositAdapter", proxyAddress);
            const rootProxy = await proxiedAdapter.get_deposit_root();
            const rootAdapter = await depositAdapter.get_deposit_root();
            expect(rootProxy).to.equal(rootAdapter);

            {
                const reportedOwner = await proxiedAdapter.owner();
                expect(reportedOwner).to.equal(ZeroAddress);
                log("reportedOwner", reportedOwner);

                const initialized = await proxiedAdapter.initialized();
                expect(initialized).to.equal(false);
                log("initialized", initialized);
            }

            const tx = await proxiedAdapter.initializeOwnable();
            const receipt = await tx.wait();
            const events = findEvents(receipt!, "OwnershipTransferred");
            expect(events.length).to.greaterThan(0);
            expect(events[0].args.previousOwner).to.equal(ZeroAddress);
            expect(events[0].args.newOwner).to.equal(owner.address);
            {
                const reportedOwner = await proxiedAdapter.owner();
                expect(reportedOwner).to.equal(owner.address);
                log("reportedOwner", reportedOwner);

                const initialized = await proxiedAdapter.initialized();
                expect(initialized).to.equal(true);
                log("initialized", initialized);
            }
            await expect(proxiedAdapter.connect(user).initializeOwnable()).to.revertedWithCustomError(
                proxiedAdapter,
                "AlreadyInitialized",
            );
        });
    });
});
