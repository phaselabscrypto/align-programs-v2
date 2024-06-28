import * as anchor from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { OrgNftGuard } from "../target/types/org_nft_guard";
import { Organization } from "../target/types/organization";
import { expect } from "chai";
import { random, sample } from "lodash";
import {
  PROGRAM_ID as PROPOSAL_PROGRAM_ID,
  proposalKey,
} from "@helium/proposal-sdk";
import { organizationKey } from "@helium/organization-sdk";
import { IDL as PROPOSAL_IDL, Proposal as ProposalIdl } from "./idls/proposal";
import { getMetadataAddress, mintCollectionNft, mintNft } from "./helpers";
import {
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { createMint } from "./utils";

const orgNftGuardKey = (name: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("guard"), Buffer.from(name)],
    anchor.workspace.OrgNftGuard.programId
  );
};

const proposalConfigKey = (name: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("proposal_config"), Buffer.from(name)],
    PROPOSAL_PROGRAM_ID
  );
};

const initializeGuard = async ({ provider, name, guardType }) => {
  const [nftGuard, bump] = orgNftGuardKey(name);

  const program = anchor.workspace.OrgNftGuard as anchor.Program<OrgNftGuard>;

  await program.methods
    .initializeGuardV0({
      name,
      guardType,
    })
    .accountsStrict({
      payer: provider.wallet.publicKey,
      nftGuard,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { guard: nftGuard, bump };
};

const initalizeProposalConfig = async ({
  provider,
  owner = provider.wallet.publicKey,
  name,
  voteController = owner,
  stateController = owner,
  onVoteHook = PublicKey.default,
}) => {
  const proposalProgram = new anchor.Program(PROPOSAL_IDL, PROPOSAL_PROGRAM_ID);

  const [proposalConfig] = proposalConfigKey(name);

  await proposalProgram.methods
    .initializeProposalConfigV0({
      name,
      voteController,
      stateController,
      onVoteHook,
    })
    .accountsStrict({
      payer: provider.wallet.publicKey,
      owner,
      proposalConfig,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { proposalConfig };
};

const initializeOrganization = async ({
  provider,
  name,
  authority = provider.wallet.publicKey,
  defaultProposalConfig,
  guard,
}) => {
  const organizationProgram = anchor.workspace
    .Organization as anchor.Program<Organization>;

  const [organization, bump] = organizationKey(
    name,
    anchor.workspace.Organization.programId
  );

  await organizationProgram.methods
    .initializeOrganizationV0({
      name,
      authority,
      guard,
      defaultProposalConfig,
      proposalProgram: PROPOSAL_PROGRAM_ID,
      uri: "https://example.com",
      parent: PublicKey.default,
    })
    .accountsStrict({
      payer: provider.wallet.publicKey,
      organization,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { organization, bump };
};

describe("org nft guard", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const me = provider.wallet.publicKey;

  const program = anchor.workspace.OrgNftGuard as anchor.Program<OrgNftGuard>;

  it("initializes org nft guard with collection mint", async () => {
    let name = "test" + Math.random();
    const address = Keypair.generate().publicKey;
    const multiplier = sample([1, 2, 5, 10, 20, 50, 100]);

    const { guard, bump } = await initializeGuard({
      provider,
      name,
      guardType: {
        collectionMint: {
          guardData: [
            {
              address,
              multiplier,
            },
          ],
        },
      },
    });

    const account = await program.account.guardV0.fetch(guard as any);
    const guardData = account.guardType.collectionMint.guardData;

    expect(account.name).to.eq(name);
    expect(account.bump).to.eq(bump);
    expect(guardData[0].address.equals(address)).to.be.true;
    expect(guardData[0].multiplier).to.eq(multiplier);
  });

  describe("with permissive guard", () => {
    let name: string;
    let guard: PublicKey;
    let proposalConfig: PublicKey;
    let organization: PublicKey;

    beforeEach(async () => {
      name = "test" + Math.random();

      ({ guard } = await initializeGuard({
        provider,
        name,
        guardType: {
          permissive: {},
        },
      }));

      ({ proposalConfig } = await initalizeProposalConfig({
        provider,
        name,
      }));

      ({ organization } = await initializeOrganization({
        provider,
        name,
        guard,
        defaultProposalConfig: proposalConfig,
      }));
    });

    it("initializes proposal", async () => {
      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32LE(0); // num proposals
      const [proposal] = proposalKey(organization, buffer);

      await program.methods
        .initializeProposalPermissivelyV0({
          name,
          uri: "https://example.com",
          maxChoicesPerVoter: 1,
          choices: [
            { name: "Aye", uri: null },
            { name: "Nay", uri: null },
          ],
          tags: [],
        })
        .accountsStrict({
          initializeProposalBase: {
            payer: me,
            guard,
            proposal,
            owner: me,
            proposalConfig,
            organization,
            systemProgram: SystemProgram.programId,
            proposalProgram: PROPOSAL_PROGRAM_ID,
            organizationProgram: anchor.workspace.Organization.programId,
          },
        })
        .rpc();

      const proposalProgram = new anchor.Program(
        PROPOSAL_IDL,
        PROPOSAL_PROGRAM_ID
      );

      const account = await proposalProgram.account.proposalV0.fetch(proposal);

      expect(account.name).to.eq(name);
      expect(account.maxChoicesPerVoter).to.eq(1);
      expect(account.choices.length).to.eq(2);
    });
  });

  describe("with collection mint guard", () => {
    const context = async ({ receiver = me }) => {
      const name = "test" + Math.random();

      const collectionMintKeypair = Keypair.generate();
      const collectionMint = collectionMintKeypair.publicKey;

      await mintCollectionNft(collectionMintKeypair, provider);

      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;

      await mintNft(collectionMintKeypair, mintKeypair, provider, receiver);

      const { guard } = await initializeGuard({
        provider,
        name,
        guardType: {
          collectionMint: {
            guardData: [
              {
                address: collectionMint,
                multiplier: 1,
              },
            ],
          },
        },
      });

      const { proposalConfig } = await initalizeProposalConfig({
        provider,
        name,
      });

      const { organization } = await initializeOrganization({
        provider,
        name,
        guard,
        defaultProposalConfig: proposalConfig,
      });

      return { name, mint, guard, proposalConfig, organization };
    };

    it("initializes proposal", async () => {
      const { name, mint, guard, proposalConfig, organization } = await context(
        {}
      );

      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32LE(0); // num proposals
      const [proposal] = proposalKey(organization, buffer);

      const metadata = await getMetadataAddress(mint);
      const tokenAccount = getAssociatedTokenAddressSync(mint, me);

      await program.methods
        .initializeProposalByNftV0({
          name,
          uri: "https://example.com",
          maxChoicesPerVoter: 1,
          choices: [
            { name: "Aye", uri: null },
            { name: "Nay", uri: null },
          ],
          tags: [],
        })
        .accountsStrict({
          initializeProposalBase: {
            payer: me,
            guard,
            proposal,
            owner: me,
            proposalConfig,
            organization,
            systemProgram: SystemProgram.programId,
            proposalProgram: PROPOSAL_PROGRAM_ID,
            organizationProgram: anchor.workspace.Organization.programId,
          },
          proposer: me,
          metadata,
          tokenAccount,
        })
        .rpc();

      const proposalProgram = new anchor.Program(
        PROPOSAL_IDL,
        PROPOSAL_PROGRAM_ID
      );

      const account = await proposalProgram.account.proposalV0.fetch(proposal);

      expect(account.name).to.eq(name);
      expect(account.maxChoicesPerVoter).to.eq(1);
      expect(account.choices.length).to.eq(2);
    });

    it("fails to initialize proposal with wrong owner", async () => {
      const receiver = Keypair.generate().publicKey;
      const { name, mint, guard, proposalConfig, organization } = await context(
        { receiver }
      );

      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32LE(0); // num proposals
      const [proposal] = proposalKey(organization, buffer);

      const metadata = await getMetadataAddress(mint);
      const tokenAccount = getAssociatedTokenAddressSync(mint, receiver);

      let logs: string;

      try {
        await program.methods
          .initializeProposalByNftV0({
            name,
            uri: "https://example.com",
            maxChoicesPerVoter: 1,
            choices: [
              { name: "Aye", uri: null },
              { name: "Nay", uri: null },
            ],
            tags: [],
          })
          .accountsStrict({
            initializeProposalBase: {
              payer: me,
              guard,
              proposal,
              owner: me,
              proposalConfig,
              organization,
              systemProgram: SystemProgram.programId,
              proposalProgram: PROPOSAL_PROGRAM_ID,
              organizationProgram: anchor.workspace.Organization.programId,
            },
            proposer: me,
            metadata,
            tokenAccount,
          })
          .simulate();
      } catch (err) {
        ({ logs } = err.simulationResponse || {});
      }

      expect(logs).to.match(/ConstraintTokenOwner/);
    });

    it("fails to initialize proposal with wrong token account", async () => {
      const receiver = Keypair.generate().publicKey;
      const { name, mint, guard, proposalConfig, organization } = await context(
        { receiver }
      );

      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32LE(0); // num proposals
      const [proposal] = proposalKey(organization, buffer);

      const metadata = await getMetadataAddress(mint);

      const [tokenAccount] = await createMint(
        provider.connection,
        provider.wallet
      );

      let logs: string;

      try {
        await program.methods
          .initializeProposalByNftV0({
            name,
            uri: "https://example.com",
            maxChoicesPerVoter: 1,
            choices: [
              { name: "Aye", uri: null },
              { name: "Nay", uri: null },
            ],
            tags: [],
          })
          .accountsStrict({
            initializeProposalBase: {
              payer: me,
              guard,
              proposal,
              owner: me,
              proposalConfig,
              organization,
              systemProgram: SystemProgram.programId,
              proposalProgram: PROPOSAL_PROGRAM_ID,
              organizationProgram: anchor.workspace.Organization.programId,
            },
            proposer: me,
            metadata,
            tokenAccount,
          })
          .simulate();
      } catch (err) {
        ({ logs } = err.simulationResponse || {});
      }

      expect(logs).to.match(/caused by account: metadata\..*ConstraintSeeds/);
    });

    it("fails to initialize proposal with insufficient weight", async () => {
      const receiver = Keypair.generate().publicKey;
      const { name, mint, guard, proposalConfig, organization } = await context(
        { receiver }
      );

      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32LE(0); // num proposals
      const [proposal] = proposalKey(organization, buffer);

      const metadata = await getMetadataAddress(mint);
      const tokenAccount = getAssociatedTokenAddressSync(mint, me);

      const tx = new Transaction();
      tx.add(
        createAssociatedTokenAccountInstruction(me, tokenAccount, me, mint)
      );
      await provider.sendAndConfirm(tx);

      let logs: string;

      try {
        await program.methods
          .initializeProposalByNftV0({
            name,
            uri: "https://example.com",
            maxChoicesPerVoter: 1,
            choices: [
              { name: "Aye", uri: null },
              { name: "Nay", uri: null },
            ],
            tags: [],
          })
          .accountsStrict({
            initializeProposalBase: {
              payer: me,
              guard,
              proposal,
              owner: me,
              proposalConfig,
              organization,
              systemProgram: SystemProgram.programId,
              proposalProgram: PROPOSAL_PROGRAM_ID,
              organizationProgram: anchor.workspace.Organization.programId,
            },
            proposer: me,
            metadata,
            tokenAccount,
          })
          .simulate();
      } catch (err) {
        ({ logs } = err.simulationResponse || {});
      }

      expect(logs).to.match(/InsufficientWeight/);
    });

    it("fails to initialize proposal with token from wrong collection", async () => {
      const { name, guard, proposalConfig, organization } = await context({});

      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32LE(0); // num proposals
      const [proposal] = proposalKey(organization, buffer);

      const collectionMintKeypair = Keypair.generate();

      await mintCollectionNft(collectionMintKeypair, provider);

      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;

      await mintNft(collectionMintKeypair, mintKeypair, provider, me);

      const metadata = await getMetadataAddress(mint);
      const tokenAccount = getAssociatedTokenAddressSync(mint, me);

      let logs: string;

      try {
        await program.methods
          .initializeProposalByNftV0({
            name,
            uri: "https://example.com",
            maxChoicesPerVoter: 1,
            choices: [
              { name: "Aye", uri: null },
              { name: "Nay", uri: null },
            ],
            tags: [],
          })
          .accountsStrict({
            initializeProposalBase: {
              payer: me,
              guard,
              proposal,
              owner: me,
              proposalConfig,
              organization,
              systemProgram: SystemProgram.programId,
              proposalProgram: PROPOSAL_PROGRAM_ID,
              organizationProgram: anchor.workspace.Organization.programId,
            },
            proposer: me,
            metadata,
            tokenAccount,
          })
          .simulate();
      } catch (err) {
        ({ logs } = err.simulationResponse || {});
      }

      expect(logs).to.match(/CollectionVerificationFailed/);
    });
  });

  describe("with mint list guard", () => {
    const context = async (
      { target = me, amount = 10 ** random(0, 9), decimals = random(0, 6) },
      divisor = new anchor.BN(1)
    ) => {
      const name = "test" + Math.random();

      const [tokenAccount, mint] = await createMint(
        provider.connection,
        provider.wallet,
        {
          amount,
          decimals,
          target,
        }
      );

      const { guard } = await initializeGuard({
        provider,
        name,
        guardType: {
          mintList: {
            guardData: [
              {
                address: mint,
                divisor,
              },
            ],
          },
        },
      });

      const { proposalConfig } = await initalizeProposalConfig({
        provider,
        name,
      });

      const { organization } = await initializeOrganization({
        provider,
        name,
        guard,
        defaultProposalConfig: proposalConfig,
      });

      return {
        name,
        mint,
        guard,
        proposalConfig,
        organization,
        tokenAccount,
      };
    };

    it("initializes proposal", async () => {
      const { name, mint, guard, proposalConfig, organization, tokenAccount } =
        await context({});

      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32LE(0); // num proposals
      const [proposal] = proposalKey(organization, buffer);

      await program.methods
        .initializeProposalByTokenV0({
          name,
          uri: "https://example.com",
          maxChoicesPerVoter: 1,
          choices: [
            { name: "Aye", uri: null },
            { name: "Nay", uri: null },
          ],
          tags: [],
        })
        .accountsStrict({
          initializeProposalBase: {
            payer: me,
            guard,
            proposal,
            owner: me,
            proposalConfig,
            organization,
            systemProgram: SystemProgram.programId,
            proposalProgram: PROPOSAL_PROGRAM_ID,
            organizationProgram: anchor.workspace.Organization.programId,
          },
          proposer: me,
          mint,
          tokenAccount,
        })
        .rpc();

      const proposalProgram = new anchor.Program(
        PROPOSAL_IDL,
        PROPOSAL_PROGRAM_ID
      );

      const account = await proposalProgram.account.proposalV0.fetch(proposal);

      expect(account.name).to.eq(name);
      expect(account.maxChoicesPerVoter).to.eq(1);
      expect(account.choices.length).to.eq(2);
    });
  });

  describe("with wallet list guard", () => {
    const context = async ({ address = me, multiplier = new anchor.BN(1) }) => {
      const name = "test" + Math.random();

      const { guard } = await initializeGuard({
        provider,
        name,
        guardType: {
          walletList: {
            guardData: [
              {
                address,
                multiplier,
              },
            ],
          },
        },
      });

      const { proposalConfig } = await initalizeProposalConfig({
        provider,
        name,
      });

      const { organization } = await initializeOrganization({
        provider,
        name,
        guard,
        defaultProposalConfig: proposalConfig,
      });

      return {
        name,
        guard,
        proposalConfig,
        organization,
      };
    };

    it("initializes proposal", async () => {
      const { name, guard, proposalConfig, organization } = await context({});

      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32LE(0); // num proposals
      const [proposal] = proposalKey(organization, buffer);

      await program.methods
        .initializeProposalByWalletV0({
          name,
          uri: "https://example.com",
          maxChoicesPerVoter: 1,
          choices: [
            { name: "Aye", uri: null },
            { name: "Nay", uri: null },
          ],
          tags: [],
        })
        .accountsStrict({
          initializeProposalBase: {
            payer: me,
            guard,
            proposal,
            owner: me,
            proposalConfig,
            organization,
            systemProgram: SystemProgram.programId,
            proposalProgram: PROPOSAL_PROGRAM_ID,
            organizationProgram: anchor.workspace.Organization.programId,
          },
          proposer: me,
        })
        .rpc();

      const proposalProgram = new anchor.Program(
        PROPOSAL_IDL,
        PROPOSAL_PROGRAM_ID
      );

      const account = await proposalProgram.account.proposalV0.fetch(proposal);

      expect(account.name).to.eq(name);
      expect(account.maxChoicesPerVoter).to.eq(1);
      expect(account.choices.length).to.eq(2);
    });
  });
});
