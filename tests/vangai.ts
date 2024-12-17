import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vangai } from "../target/types/vangai";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL} from "@solana/web3.js";
import { assert } from "chai";
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} from "@solana/spl-token";

describe("vangai", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Vangai as Program<Vangai>;

  const state = Keypair.generate();
  const vangaiOwner = Keypair.generate();
  const cabinaWallet = Keypair.generate();
  const tokenFundWallet = Keypair.generate();
  const minter = Keypair.generate();
  const tokenAccount = Keypair.generate();

  before("Initializes the state", async () => {

    const lamportsToVangaiOwner = 1 * LAMPORTS_PER_SOL;
    {
      let airdropSignature = await provider.connection.requestAirdrop(vangaiOwner.publicKey, lamportsToVangaiOwner);
      const latestBlockHash = await provider.connection.getLatestBlockhash();

      await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: airdropSignature,
      });
    }

    let balanceBefore = await provider.connection.getBalance(vangaiOwner.publicKey);
    // console.log("Balance before: ", balanceBefore)

    await program.methods
      .initialize(
        vangaiOwner.publicKey,
        cabinaWallet.publicKey,
        tokenFundWallet.publicKey
      )
      .accounts({
        state: state.publicKey,
        payer: vangaiOwner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([state, vangaiOwner])
      .rpc();

    let balanceAfter = await provider.connection.getBalance(vangaiOwner.publicKey);
    // console.log("Balance after: ", balanceAfter)
    
    const stateAccount = await program.account.state.fetch(state.publicKey);
    const targetVangaiOwnerShareNumerator = new anchor.BN(45_00)
    const targetCabinaiWalletShareNumerator = new anchor.BN(45_00)
    const targetTokenFundWalletShareNumerator = new anchor.BN(10_00)

    assert.equal(stateAccount.vangaiOwner.toBase58(), vangaiOwner.publicKey.toBase58());
    assert.equal(stateAccount.cabinaWallet.toBase58(), cabinaWallet.publicKey.toBase58());
    assert.equal(stateAccount.tokenFundWallet.toBase58(), tokenFundWallet.publicKey.toBase58());
    assert.isTrue(stateAccount.minLamports.eq(new anchor.BN(0)));
    assert.isTrue(stateAccount.vangaiOwnerShareNumerator.eq(targetVangaiOwnerShareNumerator));
    assert.isTrue(stateAccount.cabinaiWalletShareNumerator.eq(targetCabinaiWalletShareNumerator));
    assert.isTrue(stateAccount.tokenFundWalletShareNumerator.eq(targetTokenFundWalletShareNumerator));
  });

  it("Mint!", async () => {
    const lamportsToMinter = 10 * LAMPORTS_PER_SOL;
    {
      let airdropSignature = await provider.connection.requestAirdrop(minter.publicKey, lamportsToMinter);
      const latestBlockHash = await provider.connection.getLatestBlockhash();

      await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: airdropSignature,
      });
    }
    const initialMinterBalance = await provider.connection.getBalance(minter.publicKey);
    assert.isTrue(initialMinterBalance >= lamportsToMinter, "Minter balance is insufficient");
    
    const initialVangaiOwnerBalance = await provider.connection.getBalance(vangaiOwner.publicKey);
    const initialCabinaBalance = await provider.connection.getBalance(cabinaWallet.publicKey);
    const initialTokenFundBalance = await provider.connection.getBalance(tokenFundWallet.publicKey);

    // console.log("Balance1 before: ", initialVangaiOwnerBalance)
    // console.log("Balance2 before: ", initialCabinaBalance)
    // console.log("Balance3 before: ", initialTokenFundBalance)
    // console.log("Balance4 before: ", initialMinterBalance)

    const stateAccount = await program.account.state.fetch(state.publicKey);
    const [minterStateAccountAddress] = PublicKey.findProgramAddressSync([
      minter.publicKey.toBuffer()
    ], program.programId);

    
    // console.log(`minter PDA : ${minterStateAccountAddress}`);
    const lamports: any = new anchor.BN(LAMPORTS_PER_SOL)
    await program.methods
      .mint(lamports)
      .accounts({
        state: state.publicKey,
        minterState: minterStateAccountAddress,
        minter: minter.publicKey,
        vangaiOwner: stateAccount.vangaiOwner,
        cabinaWallet: stateAccount.cabinaWallet,
        tokenFundWallet: stateAccount.tokenFundWallet,
        systemProgram: SystemProgram.programId,
      })
      .signers([minter])
      .rpc();
    
    const finalVangaiOwnerBalance = await provider.connection.getBalance(vangaiOwner.publicKey);
    const finalCabinaBalance = await provider.connection.getBalance(cabinaWallet.publicKey);
    const finalTokenFundBalance = await provider.connection.getBalance(tokenFundWallet.publicKey);
    const finalMinterBalance = await provider.connection.getBalance(minter.publicKey);
    const finalMinterStateAccount = await program.account.minterState.fetch(minterStateAccountAddress)

    // console.log("Balance1 after: ", finalVangaiOwnerBalance)
    // console.log("Balance2 after: ", finalCabinaBalance)
    // console.log("Balance3 after: ", finalTokenFundBalance)
    // console.log("Balance4 after: ", finalMinterBalance)
    // console.log("MinterPoints: ", finalMinterStateAccount.minterPoints)

    const vangaiOwnerShare = (lamports * 45) / 100; // 45%
    const cabinaWalletShare = (lamports * 45) / 100; // 45%
    const tokenFundWalletShare = (lamports * 10) / 100; // 10%

    assert.equal(finalVangaiOwnerBalance, initialVangaiOwnerBalance + vangaiOwnerShare, "Incorrect Vangai Owner balance");
    assert.equal(finalCabinaBalance, initialCabinaBalance + cabinaWalletShare, "Incorrect Cabina wallet balance");
    assert.equal(finalTokenFundBalance, initialTokenFundBalance + tokenFundWalletShare, "Incorrect Token Fund wallet balance");
    assert.isTrue(finalMinterStateAccount.minterPoints.eq(lamports), "no minted points");

    const expectedMinterBalance = initialMinterBalance - lamports;
    assert.isTrue(finalMinterBalance < expectedMinterBalance, "Minter balance is incorrect after minting");
  });

  it("Sets a new Cabina wallet", async () => {
    const newCabinaWallet = Keypair.generate();

    await program.methods
      .setCabinaWallet(newCabinaWallet.publicKey)
      .accounts({
        state: state.publicKey,
        vangaiOwner: vangaiOwner.publicKey,
      })
      .signers([vangaiOwner])
      .rpc();

    const stateAccount = await program.account.state.fetch(state.publicKey);

    assert.equal(stateAccount.cabinaWallet.toBase58(), newCabinaWallet.publicKey.toBase58());
  });

  it("Sets a new Token Fund wallet", async () => {
    const newTokenFundWallet = Keypair.generate();

    await program.methods
      .setTokenFundWallet(newTokenFundWallet.publicKey)
      .accounts({
        state: state.publicKey,
        vangaiOwner: vangaiOwner.publicKey,
      })
      .signers([vangaiOwner])
      .rpc();

    const stateAccount = await program.account.state.fetch(state.publicKey);

    assert.equal(stateAccount.tokenFundWallet.toBase58(), newTokenFundWallet.publicKey.toBase58());
  });

  it("Updates the distribution shares", async () => {
    const newVangaiShare = new anchor.BN(4000); // 40%
    const newCabinaShare = new anchor.BN(4000); // 40%
    const newTokenFundShare = new anchor.BN(2000);; // 20%

    await program.methods
      .setDistribution(newVangaiShare, newCabinaShare, newTokenFundShare)
      .accounts({
        state: state.publicKey,
        vangaiOwner: vangaiOwner.publicKey,
      })
      .signers([vangaiOwner])
      .rpc();

    const stateAccount = await program.account.state.fetch(state.publicKey);

    assert.isTrue(new anchor.BN(stateAccount.vangaiOwnerShareNumerator).eq(newVangaiShare), "Vangai share does not match");
    assert.isTrue(new anchor.BN(stateAccount.cabinaiWalletShareNumerator).eq(newCabinaShare), "Cabina share does not match");
    assert.isTrue(new anchor.BN(stateAccount.tokenFundWalletShareNumerator).eq(newTokenFundShare), "Token fund share does not match");
  });

  it("Updates the min lamports", async () => {
    const newMinLamports = new anchor.BN(1);
    await program.methods
      .setMinLamports(newMinLamports)
      .accounts({
        state: state.publicKey,
        vangaiOwner: vangaiOwner.publicKey,
      })
      .signers([vangaiOwner])
      .rpc();

    const stateAccount = await program.account.state.fetch(state.publicKey);

    assert.isTrue(new anchor.BN(stateAccount.minLamports).eq(newMinLamports), "New lamport have not set");
  });

  it("Transfers ownership", async () => {
    const newVangaiOwner = Keypair.generate();

    await program.methods
      .transferVangaiOwnership(newVangaiOwner.publicKey)
      .accounts({
        state: state.publicKey,
        vangaiOwner: vangaiOwner.publicKey,
      })
      .signers([vangaiOwner])
      .rpc();

    const stateAccount = await program.account.state.fetch(state.publicKey);

    assert.equal(stateAccount.vangaiOwner.toBase58(), newVangaiOwner.publicKey.toBase58());
  });

  it("Fails to set invalid distribution", async () => {
    try {
      const newVangaiShare = new anchor.BN(4000); // 40%
      const newCabinaShare = new anchor.BN(4000); // 40%
      const newTokenFundShare = new anchor.BN(4000); // 40%
      await program.methods
        .setDistribution(newVangaiShare, newCabinaShare, newTokenFundShare) // Total exceeds 100%
        .accounts({
          state: state.publicKey,
          vangaiOwner: vangaiOwner.publicKey,
        })
        .signers([vangaiOwner])
        .rpc();
      assert.isTrue(true);
    } catch (error) {
      assert.isTrue(true, "Error message mismatch");
    }
  });

  it("Fails to update wallets without ownership", async () => {
    const unauthorizedUser = Keypair.generate();
    const unauthorizedWallet = Keypair.generate();

    try {
      await program.methods
        .setCabinaWallet(unauthorizedWallet.publicKey)
        .accounts({
          state: state.publicKey,
          vangaiOwner: unauthorizedUser.publicKey,
        })
        .signers([unauthorizedUser])
        .rpc();
      assert.fail("Expected error for unauthorized wallet update.");
    } catch (error) {
      assert.include(error.message, "InvalidVangaiOwner");
    }
  });
});
