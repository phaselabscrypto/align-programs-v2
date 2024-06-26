import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { OrgNftGuard } from "../target/types/org_nft_guard";
import { expect } from "chai";
import { random } from "lodash";

const orgNftGuardKey = (name: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("guard"), Buffer.from(name)],
    anchor.workspace.OrgNftGuard.programId
  );
};

const initializeGuardV0 = async ({ payer, name, guardType }) => {
  const [nftGuard, bumpSeed] = orgNftGuardKey(name);

  const program = anchor.workspace.OrgNftGuard as anchor.Program<OrgNftGuard>;

  await program.methods
    .initializeGuardV0({
      name,
      guardType,
    })
    .accountsStrict({
      payer,
      nftGuard,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return [nftGuard, bumpSeed];
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

    const [nftGuard, bumpSeed] = await initializeGuardV0({
      payer: me,
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
    expect(account.bump).to.eq(bumpSeed);
    expect(tokenConfigs[0].address.equals(address)).to.be.true;
    expect(tokenConfigs[0].weightReciprocal.eq(weightReciprocal)).to.be.true;
  });
});
