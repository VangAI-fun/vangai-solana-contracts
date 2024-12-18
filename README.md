# Vangai

The Vangai Smart Contract is a decentralized application for VangAI-agentd designed to handle SOL transactions and distribute funds to multiple stakeholders according to predefined share percentages. It also tracks contributions via points made by users (minters).

1. Initialize Contract State
Sets up the initial state of the contract with the following:
`vangai_owner`: The wallet that owns the Vangai protocol.
`cabina_wallet`: Wallet for Cabina's share.
`token_fund_wallet`: Wallet for the token fund.
`vangai_owner_share_numerator`, `cabinai_wallet_share_numerator`, `token_fund_wallet_share_numerator`: Shares percentages for fund distribution (default: 45%, 45%, 10% respectively).
`min_lamports`: Minimum required lamports for minting (default: 0).
`total_points`: Tracks the total contribution points for future airdrop

2. Minting
Allows a minter to pay lamports, which are distributed among:
1) `vangai_owner`
2) `cabina_wallet`
3) `token_fund_wallet`
Points are credited to the minter's account based on the contribution amount.
Distribution respects the predefined percentage shares.

3. Transfer Ownership
Transfers ownership of the Vangai protocol to a new wallet.

4. Update Wallets
Allows the owner to update the following wallets:
1) `cabina_wallet`
2) `token_fund_wallet`

5. Set Minimum Lamports
Updates the minimum lamport amount required for minting.

6. Update Distribution
Modifies the share percentages for `vangai_owner`, `cabina_wallet`, and `token_fund_wallet`.
Ensures the total share percentages equal 100%.

7. Track Contributions
Tracks the contribution points for each minter in the ``MinterState`` account.
Updates the global total points in the State account.

## Instantiating

1. Build project
```
anchor build
```

2. Run tests
```
anchor test
```

## Deployment

1. (optional) Create key
```
solana-keygen new
```

2. install packages
```
yarn
```

3. Build project
```
anchor build
```

4. Generate address of vangai
```
solana address -k target/deploy/vangai-keypair.json 
```

5. Replace generated address in macro `declare_id!`

6. Rebuild project
```
anchor build
```

7. Run deploy
```
solana program deploy target/deploy/vangai.so --url https://api.mainnet-beta.solana.com --keypair accounts/vangai-owner.json --program-id target/deploy/vangai-keypair.json
```

8. Initialize program
```
yarn run initialize
```