import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";

// $ yarn run readState
async function main() {
  const rpcUrl = "https://api.mainnet-beta.solana.com";
  const vangaiOwnerPath = path.resolve("accounts/vangai-owner.json");

  const vangaiOwnerSecretKey = JSON.parse(fs.readFileSync(vangaiOwnerPath, "utf-8"));
  const vangaiOwnerKeypair = Keypair.fromSecretKey(Uint8Array.from(vangaiOwnerSecretKey));
  const vangaiOwner = new anchor.Wallet(vangaiOwnerKeypair);

  // Создаем подключение к сети и провайдер
  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, vangaiOwner, {
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  const programId = new PublicKey("9hUyPGeYFxdfrp5XmrkaVoEbB1V8hjuigXdUAM7LQTXi");
  const statePublicKey = new PublicKey("4fU1wUSFJfiBu4eNiswrg5Q3BJzqo5E44YKTvaephBdz");

  // Подключаем программу
  const idl = JSON.parse(
    fs.readFileSync("target/idl/vangai.json", "utf-8")
  );
  const program = new anchor.Program(idl, programId, provider);

  try {
    console.log("Fetching State Account...");
    const stateAccount = await program.account.state.fetch(statePublicKey);
    console.log(stateAccount)
    // console.log("=== State Account Data ===");
    // console.log("Vangai Owner:", stateAccount.vangaiOwner.toBase58());
    // console.log("Cabina Wallet:", stateAccount.cabinaWallet.toBase58());
    // console.log("Token Fund Wallet:", stateAccount.tokenFundWallet.toBase58());
    // console.log("Min Lamports:", stateAccount.minLamports.toString());
    // console.log("Total Points:", stateAccount.totalPoints.toString());
    // console.log("Vangai Owner Share:", stateAccount.vangaiOwnerShareNumerator.toString());
    // console.log("Cabina Wallet Share:", stateAccount.cabinaiWalletShareNumerator.toString());
    // console.log("Token Fund Wallet Share:", stateAccount.tokenFundWalletShareNumerator.toString());
  } catch (err) {
    console.error("Error fetching state account:", err);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});