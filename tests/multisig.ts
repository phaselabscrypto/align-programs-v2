import {
  AnchorProvider,
  BN,
  Program,
  setProvider,
  web3,
  getProvider,
  workspace,
} from "@coral-xyz/anchor";
import {
  Metaplex,
  PublicKey,
  walletAdapterIdentity,
} from "@metaplex-foundation/js";
import { MultisigController } from "../target/types/multisig_controller";
import { IDL as PROPOSAL_IDL } from "./idls/proposal";
import {
  PROGRAM_ID as PROPOSAL_PROGRAM_ID,
  proposalKey,
} from "@helium/proposal-sdk";
import { expect } from "chai";

describe("multisig", () => {
  setProvider(AnchorProvider.env());
  const provider = getProvider() as AnchorProvider;
  const me = provider.wallet.publicKey;

  const metaplex = new Metaplex(provider.connection);
  metaplex.use(walletAdapterIdentity(provider.wallet));

  const proposalProgram = new Program(
    PROPOSAL_IDL,
    PROPOSAL_PROGRAM_ID,
    provider
  );
  const multisigProgram =
    workspace.MultisigController as Program<MultisigController>;

  let name: string;

  beforeEach(async () => {
    name = "test" + Math.random();
  });

  describe("with proposal", () => {
    let proposalConfig: PublicKey;
    let proposal: PublicKey;
    let multisig: PublicKey;
    let members: web3.Keypair[];

    beforeEach(async () => {
      proposal = proposalKey(me, Buffer.from(name, "utf-8"))[0];
      members = [new web3.Keypair(), new web3.Keypair(), new web3.Keypair()];
      multisig = PublicKey.findProgramAddressSync(
        [Buffer.from("multisig_config"), Buffer.from(name)],
        multisigProgram.programId
      )[0];

      await multisigProgram.methods
        .initializeMultisigConfigV0({
          name,
          useReputation: false,
          members: members.map((x) => x.publicKey),
        })
        .accountsStrict({
          payer: me,
          systemProgram: web3.SystemProgram.programId,
          multisigConfig: multisig,
        })
        .rpc();

      ({
        pubkeys: { proposalConfig },
      } = await proposalProgram.methods
        .initializeProposalConfigV0({
          name,
          voteController: multisig,
          stateController: me,
          onVoteHook: PublicKey.default,
        })
        .rpcAndKeys());

      const tx = await proposalProgram.methods
        .initializeProposalV0({
          seed: Buffer.from(name, "utf-8"),
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
          proposalConfig,
          payer: me,
          owner: me,
          systemProgram: web3.SystemProgram.programId,
          proposal: proposal,
          namespace: me,
        })
        .transaction();
      await provider.sendAndConfirm(tx, [], { skipPreflight: true });

      await proposalProgram.methods
        .updateStateV0({
          newState: {
            voting: {
              startTs: new BN(0),
            },
          },
        })
        .accounts({ proposal })
        .rpc();
    });

    it("allows voting on and relinquishing votes on the proposal", async () => {
      const voter = members[0];
      const voteRecord = PublicKey.findProgramAddressSync(
        [
          Buffer.from("vote-record"),
          proposal.toBuffer(),
          voter.publicKey.toBuffer(),
        ],
        multisigProgram.programId
      )[0];

      const tx = await multisigProgram.methods
        .voteV0({
          choice: 0,
        })
        .accountsStrict({
          proposal,
          payer: me,
          proposalConfig: proposalConfig,
          systemProgram: web3.SystemProgram.programId,
          voteController: multisig,
          voter: members[0].publicKey,
          stateController: me,
          onVoteHook: PublicKey.default,
          multisigConfig: multisig,
          voteRecord,
          proposalProgram: proposalProgram.programId,
        })
        .transaction();
      await provider.sendAndConfirm(tx, [voter], { skipPreflight: true });

      let acct = await proposalProgram.account.proposalV0.fetch(proposal!);
      expect(acct.choices[0].weight.toNumber()).to.eq(1);

      let markerA = await multisigProgram.account.voteRecordV0.fetchNullable(
        voteRecord!
      );
      expect(markerA?.choice).to.deep.eq(0);
      expect(markerA.votedAt.toNumber()).to.not.eq(0);
      expect(markerA?.voter.toString()).to.eq(members[0].publicKey.toBase58());
      expect(markerA?.proposal.toBase58()).to.eq(proposal.toBase58());

      const tx2 = await multisigProgram.methods
        .relinquishVoteV0()
        .accounts({
          proposal,
          payer: me,
          proposalConfig: proposalConfig,
          systemProgram: web3.SystemProgram.programId,
          voteController: multisig,
          voter: members[0].publicKey,
          stateController: me,
          onVoteHook: PublicKey.default,
          multisigConfig: multisig,
          voteRecord,
          proposalProgram: proposalProgram.programId,
        })
        .transaction();
      await provider.sendAndConfirm(tx2, [voter], { skipPreflight: true });

      acct = await proposalProgram.account.proposalV0.fetch(proposal!);
      expect(acct.choices[0].weight.toNumber()).to.eq(0);
      markerA = await multisigProgram.account.voteRecordV0.fetchNullable(
        voteRecord!
      );
      expect(markerA.choice).to.be.null;
      expect(markerA.votedAt.toNumber()).to.eq(0);
    });
  });
});
