import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { OrgNftGuard } from "../target/types/org_nft_guard";
import { Organization } from "../target/types/organization";
import { expect } from "chai";
import { random } from "lodash";
import {
  PROGRAM_ID as PROPOSAL_PROGRAM_ID,
  proposalKey,
} from "@helium/proposal-sdk";
import { organizationKey } from "@helium/organization-sdk";
import { IDL as PROPOSAL_IDL, Proposal as ProposalIdl } from "./idls/proposal";
import { getMetadataAddress, mintCollectionNft, mintNft } from "./helpers";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

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

const initializeGuardV0 = async ({ provider, name, guardType }) => {
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

  return { nftGuard, bump };
};

const initalizeProposalConfigV0 = async ({
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

const initializeOrganizationV0 = async ({
  provider,
  name,
  authority = provider.wallet.publicKey,
  defaultProposalConfig,
  nftGuard,
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
      guard: nftGuard,
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
    const weightReciprocal = new anchor.BN(10 ** random(1, 9));

    const { nftGuard, bump } = await initializeGuardV0({
      provider,
      name,
      guardType: {
        collectionMint: {
          tokenConfigs: [
            {
              address,
              weightReciprocal,
            },
          ],
        },
      },
    });

    const account = await program.account.guardV0.fetch(nftGuard as any);
    const tokenConfigs = account.guardType.collectionMint.tokenConfigs;

    expect(account.name).to.eq(name);
    expect(account.bump).to.eq(bump);
    expect(tokenConfigs[0].address.equals(address)).to.be.true;
    expect(tokenConfigs[0].weightReciprocal.eq(weightReciprocal)).to.be.true;
  });

  describe("with permissive guard", () => {
    let name: string;
    let nftGuard: PublicKey;
    let proposalConfig: PublicKey;
    let organization: PublicKey;

    beforeEach(async () => {
      name = "test" + Math.random();

      ({ nftGuard } = await initializeGuardV0({
        provider,
        name,
        guardType: {
          permissive: {},
        },
      }));

      ({ proposalConfig } = await initalizeProposalConfigV0({
        provider,
        name,
      }));

      ({ organization } = await initializeOrganizationV0({
        provider,
        name,
        nftGuard,
        defaultProposalConfig: proposalConfig,
      }));
    });

    it("initializes proposal ", async () => {
      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32LE(0); // num proposals
      const [proposal] = proposalKey(organization, buffer);

      await program.methods
        .initializeProposalV0({
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
          payer: me,
          guard: nftGuard,
          proposal,
          proposer: me,
          owner: me,
          proposalConfig,
          organization,
          systemProgram: SystemProgram.programId,
          mint: PublicKey.default,
          metadata: PublicKey.default,
          tokenAccount: PublicKey.default,
          proposalProgram: PROPOSAL_PROGRAM_ID,
          organizationProgram: anchor.workspace.Organization.programId,
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

      const { nftGuard } = await initializeGuardV0({
        provider,
        name,
        guardType: {
          collectionMint: {
            tokenConfigs: [
              {
                address: collectionMint,
                weightReciprocal: new anchor.BN(1),
              },
            ],
          },
        },
      });

      const { proposalConfig } = await initalizeProposalConfigV0({
        provider,
        name,
      });

      const { organization } = await initializeOrganizationV0({
        provider,
        name,
        nftGuard,
        defaultProposalConfig: proposalConfig,
      });

      return { name, mint, nftGuard, proposalConfig, organization };
    };

    it("initializes proposal ", async () => {
      const { name, mint, nftGuard, proposalConfig, organization } =
        await context({});

      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32LE(0); // num proposals
      const [proposal] = proposalKey(organization, buffer);

      const metadata = await getMetadataAddress(mint);
      const tokenAccount = getAssociatedTokenAddressSync(mint, me);

      await program.methods
        .initializeProposalV0({
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
          payer: me,
          guard: nftGuard,
          proposal,
          proposer: me,
          owner: me,
          proposalConfig,
          organization,
          systemProgram: SystemProgram.programId,
          mint,
          metadata,
          tokenAccount,
          proposalProgram: PROPOSAL_PROGRAM_ID,
          organizationProgram: anchor.workspace.Organization.programId,
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
      const { name, mint, nftGuard, proposalConfig, organization } =
        await context({ receiver });

      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32LE(0); // num proposals
      const [proposal] = proposalKey(organization, buffer);

      const metadata = await getMetadataAddress(mint);
      const tokenAccount = getAssociatedTokenAddressSync(mint, receiver);

      let logs: string;

      try {
        await program.methods
          .initializeProposalV0({
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
            payer: me,
            guard: nftGuard,
            proposal,
            proposer: me,
            owner: me,
            proposalConfig,
            organization,
            systemProgram: SystemProgram.programId,
            mint,
            metadata,
            tokenAccount,
            proposalProgram: PROPOSAL_PROGRAM_ID,
            organizationProgram: anchor.workspace.Organization.programId,
          })
          .simulate();
      } catch (err) {
        ({ logs } = err.simulationResponse || {});
      }

      expect(logs).to.match(
        /caused by account: token_account\..*ConstraintTokenOwner/
      );
    });

    it("fails to initialize proposal with token from wrong collection", async () => {
      const { name, nftGuard, proposalConfig, organization } = await context(
        {}
      );

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
          .initializeProposalV0({
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
            payer: me,
            guard: nftGuard,
            proposal,
            proposer: me,
            owner: me,
            proposalConfig,
            organization,
            systemProgram: SystemProgram.programId,
            mint,
            metadata,
            tokenAccount,
            proposalProgram: PROPOSAL_PROGRAM_ID,
            organizationProgram: anchor.workspace.Organization.programId,
          })
          .simulate();
      } catch (err) {
        ({ logs } = err.simulationResponse || {});
      }

      expect(logs).to.match(/CollectionVerificationFailed/);
    });
  });
});
