import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToCheckedInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
  CreateMasterEditionArgs,
  CreateMasterEditionV3InstructionAccounts,
  CreateMetadataAccountArgsV3,
  CreateMetadataAccountV3InstructionAccounts,
  createSetAndVerifySizedCollectionItemInstruction,
  PROGRAM_ADDRESS,
  SetAndVerifySizedCollectionItemInstructionAccounts,
} from "@metaplex-foundation/mpl-token-metadata";
import { Provider, utils, web3 } from "@coral-xyz/anchor";

export const getCreateMintIx = async (
  mint: web3.PublicKey,
  authority: web3.PublicKey,
  amount: number,
  decimals: number,
  connection: web3.Connection,
  reciever: web3.PublicKey = authority
): Promise<web3.TransactionInstruction[]> => {
  const ata = await getAssociatedTokenAddress(mint, reciever, true);

  let instructions = [
    web3.SystemProgram.createAccount({
      fromPubkey: authority,
      newAccountPubkey: mint,
      space: MintLayout.span,
      lamports: await getMinimumBalanceForRentExemptMint(connection),
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mint, // mint pubkey
      0, // decimals
      authority, // mint authority
      authority // freeze authority (you can use `null` to disable it. when you disable it, you can't turn it on again)
    ),
    createAssociatedTokenAccountInstruction(
      authority, // payer
      ata, // ata
      reciever, // owner
      mint // mint
    ),
    createMintToCheckedInstruction(mint, ata, authority, amount, decimals),
  ];

  return instructions;
};

export const getMetadataAddress = async (mint: web3.PublicKey) => {
  const [address, bump] = await web3.PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode("metadata"),
      new web3.PublicKey(PROGRAM_ADDRESS).toBuffer(),
      mint.toBuffer(),
    ],
    new web3.PublicKey(PROGRAM_ADDRESS)
  );

  return address;
};

export const getMasterEditionAddress = async (mint: web3.PublicKey) => {
  const [address, bump] = await web3.PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode("metadata"),
      new web3.PublicKey(PROGRAM_ADDRESS).toBuffer(),
      mint.toBuffer(),
      utils.bytes.utf8.encode("edition"),
    ],
    new web3.PublicKey(PROGRAM_ADDRESS)
  );

  return address;
};

export const getEditionMarkAddress = async (
  master_mint: web3.PublicKey,
  edition: number
) => {
  const [address, bump] = await web3.PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode("metadata"),
      new web3.PublicKey(PROGRAM_ADDRESS).toBuffer(),
      master_mint.toBuffer(),
      utils.bytes.utf8.encode("edition"),
      Buffer.from(Math.floor(edition / 248).toString()),
    ],
    new web3.PublicKey(PROGRAM_ADDRESS)
  );

  return address;
};

export const mintCollectionNft = async (
  mint: web3.Keypair,
  provider: Provider
) => {
  let instructions: web3.TransactionInstruction[] = [];
  const createMintIx = await getCreateMintIx(
    mint.publicKey,
    provider.publicKey,
    1,
    0,
    provider.connection
  );
  const metadataAddress = await getMetadataAddress(mint.publicKey);

  instructions.push(...createMintIx);

  const createMetadataAccounts: CreateMetadataAccountV3InstructionAccounts = {
    metadata: metadataAddress,
    mint: mint.publicKey,
    mintAuthority: provider.publicKey,
    payer: provider.publicKey,
    updateAuthority: provider.publicKey,
  };

  const createMetadataAccountArgs: CreateMetadataAccountArgsV3 = {
    data: {
      name: "Align Test Mint",
      symbol: "DEV",
      uri: " https://arweave.net/EV16WV9MIJvW-GVH7Zv-JKbl5_-vdcGpieC1_oqBQbs",
      sellerFeeBasisPoints: 10000,
      creators: null,
      collection: null,
      uses: null,
    },
    isMutable: false,
    collectionDetails: {
      __kind: "V1",
      size: 0,
    },
  };

  const createMetadataAccountsIx = createCreateMetadataAccountV3Instruction(
    createMetadataAccounts,
    {
      createMetadataAccountArgsV3: createMetadataAccountArgs,
    }
  );

  instructions.push(createMetadataAccountsIx);

  const masterEditionAddress = await getMasterEditionAddress(mint.publicKey);

  const createMasterEditionAccounts: CreateMasterEditionV3InstructionAccounts =
    {
      edition: masterEditionAddress,
      mint: mint.publicKey,
      updateAuthority: provider.publicKey,
      mintAuthority: provider.publicKey,
      payer: provider.publicKey,
      metadata: metadataAddress,
    };

  const createMasterEditionArgs: CreateMasterEditionArgs = {
    maxSupply: 0,
  };

  const createMasterEditionAccountsIx = createCreateMasterEditionV3Instruction(
    createMasterEditionAccounts,
    {
      createMasterEditionArgs: createMasterEditionArgs,
    }
  );

  instructions.push(createMasterEditionAccountsIx);

  await provider.sendAndConfirm(new web3.Transaction().add(...instructions), [
    mint,
  ]);
};

export const mintNft = async (
  collectionKey: web3.Keypair,
  mint: web3.Keypair,
  provider: Provider,
  reciever: web3.PublicKey,
  uri?: string
) => {
  let instructions: web3.TransactionInstruction[] = [];

  const createMintIx = await getCreateMintIx(
    mint.publicKey,
    provider.publicKey,
    1,
    0,
    provider.connection,
    reciever
  );
  const metadataAddress = await getMetadataAddress(mint.publicKey);

  instructions.push(...createMintIx);

  const createMetadataAccounts: CreateMetadataAccountV3InstructionAccounts = {
    metadata: metadataAddress,
    mint: mint.publicKey,
    mintAuthority: provider.publicKey,
    payer: provider.publicKey,
    updateAuthority: provider.publicKey,
  };
  const collection = collectionKey.publicKey;
  const createMetadataAccountArgs: CreateMetadataAccountArgsV3 = {
    data: {
      name: "name",
      symbol: "DS",
      uri: uri
        ? uri
        : "https://shdw-drive.genesysgo.net/Avy3TVpFP9M1mjrDFZdswBhdA7kZaJnyiLBPi1XRYqRa/collectionMetadata_49gW2U7ftZ724rMk6bswVayCrTNAu9aGcMiKnSj8XPAG6i5k5pxTtNSUVKZyeWFpn8npz4CVsqzL7CqXfgW33fAM.json",
      sellerFeeBasisPoints: 10000,
      creators: null,
      collection: {
        key: collection,
        verified: false,
      },
      uses: null,
    },
    isMutable: false,
    collectionDetails: null,
  };

  const createMetadataAccountsIx = createCreateMetadataAccountV3Instruction(
    createMetadataAccounts,
    {
      createMetadataAccountArgsV3: createMetadataAccountArgs,
    }
  );

  instructions.push(createMetadataAccountsIx);

  const masterEditionAddress = await getMasterEditionAddress(mint.publicKey);

  const createMasterEditionAccounts: CreateMasterEditionV3InstructionAccounts =
    {
      edition: masterEditionAddress,
      mint: mint.publicKey,
      updateAuthority: provider.publicKey,
      mintAuthority: provider.publicKey,
      payer: provider.publicKey,
      metadata: metadataAddress,
    };

  const createMasterEditionArgs: CreateMasterEditionArgs = {
    maxSupply: 0,
  };

  const createMasterEditionAccountsIx = createCreateMasterEditionV3Instruction(
    createMasterEditionAccounts,
    {
      createMasterEditionArgs: createMasterEditionArgs,
    }
  );

  instructions.push(createMasterEditionAccountsIx);
  const accounts: SetAndVerifySizedCollectionItemInstructionAccounts = {
    metadata: metadataAddress,
    collectionAuthority: provider.publicKey,
    payer: provider.publicKey,
    updateAuthority: provider.publicKey,
    collectionMint: collection,
    collection: await getMetadataAddress(collection),
    collectionMasterEditionAccount: await getMasterEditionAddress(collection),
  };
  const setCollectionIx =
    createSetAndVerifySizedCollectionItemInstruction(accounts);

  instructions.push(setCollectionIx);

  const tx = new web3.Transaction().add(...instructions);
  const sig = await provider.sendAndConfirm(tx, [mint], {
    skipPreflight: true,
  });
  return sig;
};
