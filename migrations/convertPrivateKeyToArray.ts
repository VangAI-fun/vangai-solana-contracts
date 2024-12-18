import * as anchor from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

async function main() {
  const privateKeyBase58 = '<paste your string key>';
  
  try {
    const privateKeyArray = bs58.decode(privateKeyBase58);
    console.log("Converted Private Key Array (Uint8Array):", Uint8Array.from(privateKeyArray));

    const keypair = Keypair.fromSecretKey(privateKeyArray);
    console.log("Keypair generated successfully!");

    console.log("Public Key:", keypair.publicKey.toBase58());
    console.log("Private Key (as Base58):", bs58.encode(keypair.secretKey));
  } catch (error) {
    console.error("Error decoding private key or creating Keypair:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });