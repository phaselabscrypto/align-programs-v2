import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PROGRAM_ID, init } from "@helium/nft-voter-sdk";
import {
  PROGRAM_ID as PROPOSAL_PID,
  init as initProposal,
  proposalKey
} from "@helium/proposal-sdk";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";
import { NftVoter, IDL as NftVoterIDL } from "./idls/nft_voter";
import { Proposal, IDL as ProposalIDL } from "./idls/proposal";
import { VoteProxy, IDL as ProxyIDL } from "../target/types/vote_proxy";

describe("vote-proxy", () => {
  // Configure the client to use the local cluster.
  const ProxyPID = new PublicKey("4DXSkEgY4NTApL27cfX2tviysBKPrxWa4W3wAWTb4oGo")
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const me = provider.wallet.publicKey;
  let proposalProgram: Program<Proposal>;
  let nftVoterProgram: Program<NftVoter>;
  const proxyProgram: Program<VoteProxy> = new Program(ProxyIDL, ProxyPID, provider);
  const metaplex = new Metaplex(provider.connection);
  metaplex.use(walletAdapterIdentity(provider.wallet));

  let name: string;
  beforeEach(async () => {
    name = "1";

    nftVoterProgram = new Program(NftVoterIDL,PROGRAM_ID, provider);

    proposalProgram = new Program(
      ProposalIDL,
      PROPOSAL_PID,
      provider,
    );

  });

  describe("with proposal", () => {
    let proposalConfig: PublicKey | undefined;
    let proposal: PublicKey | undefined;
    let nftVoter: PublicKey | undefined;
    let collection: PublicKey;
    let mint: PublicKey;
    const collectionAuthority = Keypair.generate();

    beforeEach(async () => {
      collection = (
        await metaplex.nfts().create({
          uri: "https://example.com",
          name: "test",
          symbol: "test",
          sellerFeeBasisPoints: 0,
          updateAuthority: collectionAuthority,
          tokenOwner: collectionAuthority.publicKey,
        })
      ).nft.address;

      mint = (
        await metaplex.nfts().create({
          uri: "https://example.com",
          name: "test",
          symbol: "test",
          sellerFeeBasisPoints: 0,
          collection,
          collectionAuthority,
        })
      ).nft.address;

      ({
        pubkeys: { nftVoter },
      } = await nftVoterProgram.methods
        .initializeNftVoterV0({
          name,
          authority: me,
        })
        .accounts({
          collection,
        })
        .rpcAndKeys({ skipPreflight: true }));
      ({
        pubkeys: { proposalConfig },
      } = await proposalProgram.methods
        .initializeProposalConfigV0({
          name,
          voteController: nftVoter!,
          stateController: me,
          onVoteHook: PublicKey.default,
        })
        .rpcAndKeys({ skipPreflight: true }));
        const propkey =  proposalKey(me, Buffer.from(name, "utf-8"))
      const proposal = await proposalProgram.methods
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
        .accounts({ proposalConfig, namespace: me, owner: me, proposal: propkey[0] })
        .rpcAndKeys({ skipPreflight: true });
        console.log(proposal)
      const tx = await proxyProgram.methods.initializeProxyV0(
        {
          name: "test",
          authority: me,
          conditionals: [],
          fallbackContoller: nftVoterProgram.programId,
          
        }
      )
      .accounts({proxy: PublicKey.findProgramAddressSync([
        Buffer.from("proxy"),
        Buffer.from("test")
      ], ProxyPID)[0]})
      .transaction()
      await proxyProgram.provider.sendAndConfirm(tx, [], {skipPreflight: true})
      await proposalProgram.methods
        .updateStateV0({
          newState: {
            voting: {
              startTs: new BN(0),
            },
          },
        })
        .accounts({ proposal: proposal.pubkeys.proposal })
        .rpc();
    });

    it("allows voting on and relinquishing votes on the proposal", async () => {
      const {
        pubkeys: { marker },
      } = await nftVoterProgram.methods
        .voteV0({
          choice: 0,
        })
        .accounts({ mint, proposal, nftVoter })
        .rpcAndKeys({ skipPreflight: true });

      let acct = await proposalProgram.account.proposalV0.fetch(proposal!);
      expect(acct.choices[0].weight.toNumber()).to.eq(1);
      let markerA = await nftVoterProgram.account.voteMarkerV0.fetchNullable(marker!);
      expect(markerA?.choices).to.deep.eq([0]);

      await nftVoterProgram.methods
        .relinquishVoteV0({
          choice: 0,
        })
        .accounts({ mint, proposal, refund: me, nftVoter })
        .rpc({ skipPreflight: true });

      acct = await proposalProgram.account.proposalV0.fetch(proposal!);
      expect(acct.choices[0].weight.toNumber()).to.eq(0);
      markerA = await nftVoterProgram.account.voteMarkerV0.fetchNullable(marker!);
      expect(markerA).to.be.null;
    });
  });
});
