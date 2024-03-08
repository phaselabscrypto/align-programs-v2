import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Proposal, IDL as ProposalIDL  } from "./idls/proposal";
import { PublicKey } from "@solana/web3.js";
import {
  PROGRAM_ID as PROPOSAL_PID,
  init as initProposal,
} from "@helium/proposal-sdk";
import {
  proposalKey
} from "@helium/organization-sdk"
import { Organization, IDL as OrganizationIDL } from "../target/types/organization";
import { OrgNftGuard, IDL as OrgNftGuardIDL } from "../target/types/org_nft_guard";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";
import chaiPromise from "chai-as-promised"
import { expect, use } from "chai";
import {randomBytes} from "crypto"
import { getMetadataAddress, mintCollectionNft, mintNft } from "./helpers";
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync } from "@solana/spl-token";

use(chaiPromise)

describe("organization", () => {
  const OrgPID = new PublicKey("GaZVotekguK2dubFsnqHs8LFmKGDfRHBQXrwfVEXPa96")
  const gaurdPID = new PublicKey("8BgW2REXu3HZU8FWNdVHkvdWVTDDgupmhLJk8dc86xA2")

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const me = provider.wallet.publicKey;
  let proposalProgram: Program<Proposal>;
  const orgProgram: Program<Organization> = new Program(OrganizationIDL, OrgPID, provider);
  let guardProgram: Program<OrgNftGuard>;
  let organization: PublicKey | undefined;
  let name: string;
  let collection: PublicKey;
  let collectionKey: anchor.web3.Keypair
  let mint: PublicKey;
  const metaplex = new Metaplex(provider.connection);
  metaplex.use(walletAdapterIdentity(provider.wallet));
  let guardKey : PublicKey| undefined;
  let guardName : string | undefined
  beforeEach(async () => {

    name = randomBytes(4).toString('hex');
    organization = PublicKey.findProgramAddressSync([
      Buffer.from("organization"),
      Buffer.from(name)
    ], OrgPID)[0]
    // @ts-ignore
    proposalProgram = new Program(
      ProposalIDL,
      PROPOSAL_PID,
      provider,
    );


    guardProgram = new Program(OrgNftGuardIDL, gaurdPID, provider);

  });

  it("initializes an organization by name", async () => {
     const tx = await orgProgram.methods
      .initializeOrganizationV0({
        name,
        authority: me,
        defaultProposalConfig: PublicKey.default,
        proposalProgram: proposalProgram.programId,
        uri: "https://example.com",
        guard: me,
        parent: PublicKey.default,
      })
      .accountsStrict({
        organization: organization,
        payer: me,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .transaction();
      await provider.sendAndConfirm(tx, [], {skipPreflight: true})

    const acct = await orgProgram.account.organizationV0.fetch(organization!);
    expect(acct.defaultProposalConfig.toBase58()).to.eq(
      PublicKey.default.toBase58()
    );
    expect(acct.authority.toBase58()).to.eq(me.toBase58());
    expect(acct.name).to.eq(name);
    expect(acct.uri).to.eq("https://example.com");
  });

  describe("with org and proposal config", () => {
    let proposalConfig: PublicKey | undefined;

    beforeEach(async () => {
      ({
        pubkeys: { proposalConfig },
      } = await proposalProgram.methods
        .initializeProposalConfigV0({
          name,
          voteController: me,
          stateController: me,
          onVoteHook: PublicKey.default,
        })
        .rpcAndKeys());

    await orgProgram.methods
        .initializeOrganizationV0({
          name,
          authority: me,
          defaultProposalConfig: proposalConfig!,
          proposalProgram: proposalProgram.programId,
          uri: "https://example.com",
          guard: me,
          parent: PublicKey.default
        })
        .accounts({organization})
        .rpcAndKeys({ skipPreflight: true });
    });

    it("allows updating the organization", async () => {
      let proposal =  proposalKey(organization, 0)[0]
      await orgProgram.methods
        .updateOrganizationV0({
          uri: "https://foo.com",
          defaultProposalConfig: me,
          proposalProgram: me,
          authority: PublicKey.default,
        })
        .accounts({ organization })
        .rpc({ skipPreflight: true });

      const acct = await orgProgram.account.organizationV0.fetch(organization!);
      expect(acct.defaultProposalConfig.toBase58()).to.eq(
        me.toBase58()
      );
      expect(acct.authority.toBase58()).to.eq(PublicKey.default.toBase58());
      expect(acct.name).to.eq(name);
      expect(acct.uri).to.eq("https://foo.com");
    });

    it("creates a proposal with the default config", async () => {
      let proposal = proposalKey(organization, 0)[0]
      const tx = await orgProgram.methods
        .initializeProposalV0({
          maxChoicesPerVoter: 1,
          name,
          uri: "https://example.com",
          choices: [
            {
              name: "Yes",
              uri: null,
            },
            {
              name: "No",
              uri: null,
            },
          ],
          tags: ["test", "tags"],
        })
        .accountsStrict({
          organization, 
          owner: me, 
          proposal: proposalKey(organization, 0)[0],
          payer: me,
          proposalConfig: proposalConfig,
          systemProgram: anchor.web3.SystemProgram.programId,
          guard: me,
          proposalProgram: PROPOSAL_PID
        }).transaction()
        await provider.sendAndConfirm(tx, [], {skipPreflight: true})


      const acct = await proposalProgram.account.proposalV0.fetch(proposal!);

      expect(acct.seed.readUint32LE()).to.eq(0);
      expect(acct.name).to.eq(name);
      expect(acct.uri).to.eq("https://example.com");
      expect(acct.choices[0].name).to.eq("Yes");
      expect(acct.choices[1].name).to.eq("No");
      expect(acct.maxChoicesPerVoter).to.eq(1);
      expect(acct.tags[0]).to.eq("test");
      expect(acct.tags[1]).to.eq("tags");

      expect(proposal?.toBase58()).to.eq(
        proposalKey(organization!, 0)[0].toBase58()
      );
    });

    describe("with proposal", () => {
      beforeEach(async () => {
        let proposal =  proposalKey(organization, 0)[0]
        await orgProgram.methods
          .initializeProposalV0({
            maxChoicesPerVoter: 1,
            name,
            uri: "https://example.com",
            choices: [
              {
                name: "Yes",
                uri: null,
              },
              {
                name: "No",
                uri: null,
              },
            ],
            tags: ["test", "tags"],
          })
          .accountsStrict({
            organization, 
            owner: me, 
            proposal: proposalKey(organization, 0)[0],
            payer: me,
            proposalConfig: proposalConfig,
            systemProgram: anchor.web3.SystemProgram.programId,
            guard: me,
            proposalProgram: PROPOSAL_PID
          })
          .rpcAndKeys({ skipPreflight: true });
        await proposalProgram.methods
          .updateStateV0({
            newState: {
              voting: {
                startTs: new anchor.BN(0),
              },
            },
          })
          .accountsStrict({
            proposal,
            proposalConfig: proposalConfig,
            stateController: me
          })
          .rpc();
      });
      it("allows voting on the proposal", async () => {
        let proposal = proposalKey(organization, 0)[0]
        const tx = await proposalProgram.methods
          .voteV0({
            choice: 0,
            weight: new anchor.BN(1),
            removeVote: false,
          })
          .accountsStrict({
            proposal, 
            voter: me,
            proposalConfig: proposalConfig,
            voteController: me,
            stateController: me,
            onVoteHook: PublicKey.default,
          }).transaction()
          await provider.sendAndConfirm(tx, [], {skipPreflight: true})
        });
    });
  });


  describe("with org + guard and proposal config", () => {
    let proposalConfig: PublicKey | undefined;

    beforeEach(async () => {
      ({
        pubkeys: { proposalConfig },
      } = await proposalProgram.methods
        .initializeProposalConfigV0({
          name,
          voteController: me,
          stateController: me,
          onVoteHook: PublicKey.default,
        })
        .rpcAndKeys());


        collectionKey =  new anchor.web3.Keypair()
        collection = collectionKey.publicKey
        await mintCollectionNft(collectionKey, provider)

        guardName = randomBytes(4).toString('hex');

       guardKey = PublicKey.findProgramAddressSync([
                Buffer.from("guard"),
                Buffer.from(guardName)
              ], gaurdPID)[0]
        await guardProgram.methods.initializeGuardV0({
          name: guardName,
          guardType: {collectionMint: {mints: [collection]}},
          authority: me
        }).accountsStrict({
          payer: me,
          nftGuard: guardKey,
          systemProgram: anchor.web3.SystemProgram.programId
        }).rpc({skipPreflight: true})

        await orgProgram.methods
        .initializeOrganizationV0({
          name,
          authority: me,
          defaultProposalConfig: proposalConfig!,
          proposalProgram: proposalProgram.programId,
          uri: "https://example.com",
          guard: guardKey,
          parent: PublicKey.default
        })
        .accounts({organization})
        .rpcAndKeys({ skipPreflight: true });
  
    });

    it("allows updating the organization", async () => {
      let proposal =  proposalKey(organization, 0)[0]
      await orgProgram.methods
        .updateOrganizationV0({
          uri: "https://foo.com",
          defaultProposalConfig: me,
          proposalProgram: me,
          authority: PublicKey.default,
        })
        .accounts({ organization })
        .rpc({ skipPreflight: true });

      const acct = await orgProgram.account.organizationV0.fetch(organization!);
      expect(acct.defaultProposalConfig.toBase58()).to.eq(
        me.toBase58()
      );
      expect(acct.authority.toBase58()).to.eq(PublicKey.default.toBase58());
      expect(acct.name).to.eq(name);
      expect(acct.uri).to.eq("https://foo.com");
    });

    it("creating a proposal with the default config from org program should fail", async () => {
      let proposal = proposalKey(organization, 0)[0]
      const tx = await orgProgram.methods
        .initializeProposalV0({
          maxChoicesPerVoter: 1,
          name,
          uri: "https://example.com",
          choices: [
            {
              name: "Yes",
              uri: null,
            },
            {
              name: "No",
              uri: null,
            },
          ],
          tags: ["test", "tags"],
        })
        .accountsStrict({
          organization, 
          owner: me, 
          proposal: proposalKey(organization, 0)[0],
          payer: me,
          proposalConfig: proposalConfig,
          systemProgram: anchor.web3.SystemProgram.programId,
          guard: guardKey,
          proposalProgram: PROPOSAL_PID
        }).transaction()
        const sendPromise = provider.sendAndConfirm(tx, [], {skipPreflight: true})

        await expect(sendPromise).to.be.rejectedWith("Signature verification failed.");

    });

    it("creating proposal without guard token should fail", async () => {
      let proposal =  proposalKey(organization, 0)[0]

      const mockcollectionKey =  new anchor.web3.Keypair()
      await mintCollectionNft(mockcollectionKey, provider)
      const mintKey =  new anchor.web3.Keypair()
      const mockmint = mintKey.publicKey
      await mintNft(mockcollectionKey, mintKey, provider, me)
      
      const sendPromise =  guardProgram.methods.intializeProposalV0({
        maxChoicesPerVoter: 1,
        name,
        uri: "https://example.com",
        choices: [
          {
            name: "Yes",
            uri: null,
          },
          {
            name: "No",
            uri: null,
          },
        ],
        tags: ["test", "tags"],
      }).accountsStrict({
        organization,
        owner: me,
        proposal: proposalKey(organization, 0)[0],
        payer: me,
        proposalConfig: proposalConfig,
        systemProgram: anchor.web3.SystemProgram.programId,
        guard: guardKey,
        proposalProgram: PROPOSAL_PID,
        proposer: me,
        mint: mockmint,
        metadata: await getMetadataAddress(mockmint),
        tokenAccount: getAssociatedTokenAddressSync(mockmint, me),
        organizationProgram: orgProgram.programId
      })
      .rpc()

      await expect(sendPromise).to.be.rejectedWith("AnchorError occurred. Error Code: CollectionVerificationFailed. Error Number: 6001. Error Message: The collection is either not verified or the mint does not match..");

    })

    it("creates proposal with guard token from collection", async () => {
      let proposal =  proposalKey(organization, 0)[0]

      const mintKey =  new anchor.web3.Keypair()
      mint = mintKey.publicKey
      await mintNft(collectionKey, mintKey, provider, me)
      
      await guardProgram.methods.intializeProposalV0({
        maxChoicesPerVoter: 1,
        name,
        uri: "https://example.com",
        choices: [
          {
            name: "Yes",
            uri: null,
          },
          {
            name: "No",
            uri: null,
          },
        ],
        tags: ["test", "tags"],
      }).accountsStrict({
        organization,
        owner: me,
        proposal: proposalKey(organization, 0)[0],
        payer: me,
        proposalConfig: proposalConfig,
        systemProgram: anchor.web3.SystemProgram.programId,
        guard: guardKey,
        proposalProgram: PROPOSAL_PID,
        proposer: me,
        mint: mint,
        metadata: await getMetadataAddress(mint),
        tokenAccount: getAssociatedTokenAddressSync(mint, me),
        organizationProgram: orgProgram.programId
      })
      .rpc()

      const acct = await proposalProgram.account.proposalV0.fetch(proposal!);

      expect(acct.seed.readUint32LE()).to.eq(0);
      expect(acct.name).to.eq(name);
      expect(acct.uri).to.eq("https://example.com");
      expect(acct.choices[0].name).to.eq("Yes");
      expect(acct.choices[1].name).to.eq("No");
      expect(acct.maxChoicesPerVoter).to.eq(1);
      expect(acct.tags[0]).to.eq("test");
      expect(acct.tags[1]).to.eq("tags");

      expect(proposal?.toBase58()).to.eq(
        proposalKey(organization!, 0)[0].toBase58()
      );
    })

    
  });
});
