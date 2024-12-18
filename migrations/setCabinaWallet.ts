import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import fs from "fs";
import path from "path";

async function main() {
  const rpcUrl = "https://api.mainnet-beta.solana.com";
  const vangaiOwnerPath = path.resolve("accounts/vangai-owner.json");
  const statePath = path.resolve("accounts/state.json");
  const newCabinaWalletPublicKey = new PublicKey("p7KYc5Zr1wBsfYPyw985jbjCTXT9hG8nLQdpcgqp1ou");

  const vangaiOwnerSecretKey = JSON.parse(fs.readFileSync(vangaiOwnerPath, "utf-8"));
  const vangaiOwnerKeypair = Keypair.fromSecretKey(Uint8Array.from(vangaiOwnerSecretKey));
  const vangaiOwnerWallet = new anchor.Wallet(vangaiOwnerKeypair);

  const stateSecretKey = JSON.parse(fs.readFileSync(statePath, "utf-8"));
  const stateKeypair = Keypair.fromSecretKey(Uint8Array.from(stateSecretKey));

  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, vangaiOwnerWallet, {
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  const programId = new PublicKey("9hUyPGeYFxdfrp5XmrkaVoEbB1V8hjuigXdUAM7LQTXi");
  const idl = JSON.parse(fs.readFileSync("target/idl/vangai.json", "utf-8"));
  const program = new anchor.Program(idl, programId, provider);

  console.log("Vangai Owner Public Key:", vangaiOwnerKeypair.publicKey.toBase58());
  console.log("State Public Key:", stateKeypair.publicKey.toBase58());
  console.log("New Cabina Wallet Public Key:", newCabinaWalletPublicKey.toBase58());

  try {
    console.log("\nCalling setCabinaWallet...");
    const tx = await program.methods
      .setCabinaWallet(newCabinaWalletPublicKey)
      .accounts({
        state: stateKeypair.publicKey,
        vangaiOwner: vangaiOwnerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([vangaiOwnerKeypair])
      .rpc();

    console.log("\nCabina Wallet updated successfully!");
    console.log("Transaction Signature:", tx);
  } catch (err) {
    console.error("Error during setCabinaWallet call:", err);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});