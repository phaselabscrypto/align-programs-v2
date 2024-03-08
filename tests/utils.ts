// Test helpers from Cardinal Labs
// Source: https://github.com/cardinal-labs/cardinal-staking/blob/main/tests/utils.ts

import {
  findMintEditionId,
  findMintMetadataId,
  findRuleSetId,
  findTokenRecordId,
  METADATA_PROGRAM_ID,
} from "@cardinal/common";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";

import {
  createCreateInstruction,
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
  createMintInstruction,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { encode } from "@msgpack/msgpack";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type {
  Connection,
  PublicKey,
  SendTransactionError,
  Signer,
} from "@solana/web3.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmRawTransaction,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function newAccountWithLamports(
  connection: Connection,
  lamports = LAMPORTS_PER_SOL * 10,
  keypair = Keypair.generate()
): Promise<Keypair> {
  const account = keypair;
  const signature = await connection.requestAirdrop(
    account.publicKey,
    lamports
  );
  await connection.confirmTransaction(signature, "confirmed");
  return account;
}


export const createMint = async (
  connection: Connection,
  wallet: Wallet,
  config?: MintConfig
): Promise<[PublicKey, PublicKey]> => {
  const mintKeypair = Keypair.generate();
  const mintId = mintKeypair.publicKey;
  const [tx, ata] = await createMintTx(
    connection,
    mintKeypair.publicKey,
    wallet.publicKey,
    config
  );
  await executeTransaction(connection, tx, wallet, { signers: [mintKeypair] });
  return [ata, mintId];
};

export type MintConfig = {
  target?: PublicKey;
  amount?: number;
  decimals?: number;
};
export const createMintTx = async (
  connection: Connection,
  mintId: PublicKey,
  authority: PublicKey,
  config?: MintConfig
): Promise<[Transaction, PublicKey]> => {
  const target = config?.target ?? authority;
  const ata = getAssociatedTokenAddressSync(mintId, target, true);
  return [
    new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: authority,
        newAccountPubkey: mintId,
        space: MINT_SIZE,
        lamports: await getMinimumBalanceForRentExemptMint(connection),
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMint2Instruction(
        mintId,
        config?.decimals ?? 0,
        authority,
        authority
      ),
      createAssociatedTokenAccountInstruction(authority, ata, target, mintId),
      createMintToInstruction(mintId, ata, authority, config?.amount ?? 1)
    ),
    ata,
  ];
};

export const createMasterEdition = async (
  connection: Connection,
  wallet: Wallet,
  config?: { target?: PublicKey }
): Promise<[PublicKey, PublicKey]> => {
  const mintKeypair = Keypair.generate();
  const mintId = mintKeypair.publicKey;
  const target = config?.target ?? wallet.publicKey;
  const ata = getAssociatedTokenAddressSync(mintId, target, true);
  const tx = await createMasterEditionTx(
    connection,
    mintKeypair.publicKey,
    wallet.publicKey,
    config
  );
  await executeTransaction(connection, tx, wallet, { signers: [mintKeypair] });
  return [ata, mintId];
};

export const createMasterEditionTx = async (
  connection: Connection,
  mintId: PublicKey,
  authority: PublicKey,
  config?: { target?: PublicKey }
) => {
  const target = config?.target ?? authority;
  const ata = getAssociatedTokenAddressSync(mintId, target);
  const metadataId = findMintMetadataId(mintId);
  const editionId = findMintEditionId(mintId);

  return new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: authority,
      newAccountPubkey: mintId,
      space: MINT_SIZE,
      lamports: await getMinimumBalanceForRentExemptMint(connection),
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(mintId, 0, authority, authority),
    createAssociatedTokenAccountInstruction(authority, ata, target, mintId),
    createMintToInstruction(mintId, ata, authority, 1),
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataId,
        mint: mintId,
        updateAuthority: authority,
        mintAuthority: authority,
        payer: authority,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: `name-${Math.random()}`,
            symbol: "SYMB",
            uri: `uri-${Math.random()}`,
            sellerFeeBasisPoints: 0,
            creators: [{ address: authority, share: 100, verified: true }],
            collection: null,
            uses: null,
          },
          collectionDetails: null,
          isMutable: true,
        },
      }
    ),
    createCreateMasterEditionV3Instruction(
      {
        edition: editionId,
        mint: mintId,
        updateAuthority: authority,
        mintAuthority: authority,
        metadata: metadataId,
        payer: authority,
      },
      { createMasterEditionArgs: { maxSupply: 0 } }
    )
  );
};

export async function executeTransaction(
  connection: Connection,
  tx: Transaction,
  wallet: Wallet,
  config?: { signers?: Signer[]; silent?: boolean }
): Promise<string> {
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = wallet.publicKey;
  tx = await wallet.signTransaction(tx);
  if (config?.signers) {
    tx.partialSign(...(config?.signers ?? []));
  }
  try {
    const txid = await sendAndConfirmRawTransaction(connection, tx.serialize());
    return txid;
  } catch (e) {
    if (!config?.silent) {
      handleError(e);
    }
    throw e;
  }
}

export const handleError = (e: any) => {
  const message = (e as SendTransactionError).message ?? "";
  const logs = (e as SendTransactionError).logs;
  if (logs) {
    console.log(logs, message);
  } else {
    console.log(e, message);
  }
};


