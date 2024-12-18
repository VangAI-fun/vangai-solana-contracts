import * as anchor from "@coral-xyz/anchor";
import { Connection, SystemProgram, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";;
import fs from "fs";
import path from "path";

// $ yarn run initialize
async function main() {
  
  // const rpcUrl = "https://localhost:8899"
  const rpcUrl = "https://api.mainnet-beta.solana.com";
  const vangaiOwnerPath = path.resolve("accounts/vangai-owner.json");
  const vangaiOwnerSecretKey = JSON.parse(fs.readFileSync(vangaiOwnerPath, "utf-8"));
  const vangaiOwner = Keypair.fromSecretKey(Uint8Array.from(vangaiOwnerSecretKey));
  // console.log(vangaiOwner.publicKey.toBase58())

  const statePath = path.resolve("accounts/state.json")
  const stateSecretKey = JSON.parse(fs.readFileSync(statePath, "utf-8"));
  const state = Keypair.fromSecretKey(Uint8Array.from(stateSecretKey));
  // console.log(state.publicKey.toBase58())
  
  const tokenFundPath = path.resolve("accounts/token-fund.json")
  const tokenFundSecretKey = JSON.parse(fs.readFileSync(tokenFundPath, "utf-8"));
  const tokenFund = Keypair.fromSecretKey(Uint8Array.from(tokenFundSecretKey));
  // console.log(tokenFund.publicKey.toBase58())
  
  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(vangaiOwner), {
    preflightCommitment: "confirmed",
  });

  const cabinaWalletPublicKey = new PublicKey('FfqUrLzWbvBvkSDCuKmRnjrXvwd2WJfnDYxRkwdm6U4U')

  anchor.setProvider(provider);
  // const program = anchor.workspace.Vangai;
  const idlPath = path.resolve("target/idl/vangai.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const programId = new PublicKey("9hUyPGeYFxdfrp5XmrkaVoEbB1V8hjuigXdUAM7LQTXi");
  const program = new anchor.Program(idl, programId, provider);

  console.log("State Account Public Key:", state.publicKey.toBase58());
  console.log("Vangai Owner Public Key:", vangaiOwner.publicKey.toBase58());
  console.log("Cabina Wallet Public Key:", cabinaWalletPublicKey.toBase58());
  console.log("Token Fund Public Key:", tokenFund.publicKey.toBase58());

  try {
    // console.log("\nRequesting airdrop for deployer wallet...");
    // {
    //   const airdropSignature = await provider.connection.requestAirdrop(
    //     vangaiOwner.publicKey,
    //     2 * LAMPORTS_PER_SOL
    //   );
    //   await provider.connection.confirmTransaction(airdropSignature);
    //   console.log("Airdrop successful!");
    // }
    console.log("\nInitializing program...");
    const tx = await program.methods
      .initialize(
        vangaiOwner.publicKey,
        cabinaWalletPublicKey,
        tokenFund.publicKey
      )
      .accounts({
        state: state.publicKey,
        payer: vangaiOwner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([state, vangaiOwner])
      .rpc();

    console.log("\nProgram successfully initialized!");
    console.log("Transaction Signature:", tx);
    console.log("ProgramId: ", program.programId.toBase58())
  } catch (err) {
    console.error("\nError during deployment:", err);
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
