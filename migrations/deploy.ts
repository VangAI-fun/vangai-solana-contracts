const anchor = require("@coral-xyz/anchor");
const { SystemProgram, Keypair, LAMPORTS_PER_SOL } = require("@solana/web3.js");

module.exports = async function (provider) {
  anchor.setProvider(provider);
  const program = anchor.workspace.Vangai;

  const state = Keypair.generate();
  const vangaiOwner = Keypair.generate();
  const cabinaWallet = Keypair.generate();
  const tokenFundWallet = Keypair.generate();

  console.log("Requesting airdrop for deployer...");
  const airdropSignature = await provider.connection.requestAirdrop(
    provider.wallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction(airdropSignature);
  console.log("Airdrop completed!");

  const stateAccountRentExemptBalance = await provider.connection.getMinimumBalanceForRentExemption(
    program.account.state.size
  );
  console.log("State Rent-Exempt Balance:", stateAccountRentExemptBalance);

  console.log("Deploying state account and initializing program...");
  const tx = await program.methods
    .initialize(
      vangaiOwner.publicKey,
      cabinaWallet.publicKey,
      tokenFundWallet.publicKey
    )
    .accounts({
      state: state.publicKey,
      payer: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([state])
    .rpc();

  console.log("Deployment transaction signature:", tx);

  console.log("Deployment completed successfully!");
  console.log("State Account Public Key:", state.publicKey.toBase58());
  console.log("Vangai Owner Public Key:", vangaiOwner.publicKey.toBase58());
  console.log("Cabina Wallet Public Key:", cabinaWallet.publicKey.toBase58());
  console.log("Token Fund Wallet Public Key:", tokenFundWallet.publicKey.toBase58());
};