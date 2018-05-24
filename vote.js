const SIMPLE_CASPER_ABI = require("./simple_casper.json");
const PURITY_CHECKER_ABI = require("./purity.json");
const PRIVATE_KEY = "e75e747d3880d72ff459342a89b025ec59f763524049ba4666cc86f184f48216";

const Web3 = require("web3");
const RLP = require("rlp");
const secp256k1 = require('secp256k1');
const web3 = new Web3("ws://localhost:8546");

const NON_REVERT_MIN_DEPOSITS = web3.utils.toWei("1", "ether");

const casper = new web3.eth.Contract(
  SIMPLE_CASPER_ABI,
  "0x0000000000000000000000000000000000000040"
);

const vote = async () => {
  console.log(`\nStart voting round ...`);

  const validatorIndex = 1;
  console.log(`Validator index: ${validatorIndex}`, validatorIndex);

  const recommendedTargetHash = await casper.methods.recommended_target_hash().call();
  console.log(`Recommended target hash: ${recommendedTargetHash}`);

  const currentEpoch = parseInt(await casper.methods.current_epoch().call());
  console.log(`Current epoch: ${currentEpoch}`);

  const recommendedSourceEpoch = parseInt(await casper.methods.recommended_source_epoch().call());
  console.log(`Recommended source epoch: ${recommendedSourceEpoch}`);

  const highestJustifiedEpoch = parseInt(await casper.methods.highest_justified_epoch(NON_REVERT_MIN_DEPOSITS).call());
  console.log(`Highest justified epoch: ${highestJustifiedEpoch}`);

  const highestFinalizedEpoch = parseInt(await casper.methods.highest_finalized_epoch(NON_REVERT_MIN_DEPOSITS).call());
  console.log(`Highest finalized epoch: ${highestFinalizedEpoch}`);

  const highestFinalizedHash = await casper.methods.checkpoint_hashes(highestFinalizedEpoch).call();
  console.log(`Highest finalized hash: ${highestFinalizedHash}`);

  const rawMessage = RLP.encode([
    validatorIndex,
    Buffer.from(recommendedTargetHash.substring(2), "hex"),
    currentEpoch,
    recommendedSourceEpoch
  ]);

  const hashed = web3.utils.sha3("0x" + rawMessage.toString("hex"));
  const signedHashed = secp256k1.sign(
    Buffer.from(hashed.substring(2), "hex"),
    Buffer.from(PRIVATE_KEY, "hex")
  );

  const signature = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 27 + signedHashed.recovery]).toString("hex") + signedHashed.signature.toString("hex");

  console.log(`Signature length: ${Buffer.from(signature, "hex").length}`);
  console.log(`Hashed: ${hashed}`);
  console.log(`Signature: ${"0x" + signature}`);

  const message = "0x" + RLP.encode([
    validatorIndex,
    Buffer.from(recommendedTargetHash.substring(2), "hex"),
    currentEpoch,
    recommendedSourceEpoch,
    Buffer.from(signature, "hex")
  ]).toString("hex");

  console.log(await casper.methods.vote(message).send({
    from: "0x00402845b96a30cfb8d49449d4b0159bcecd1d89",
  }));
};

vote()
  .then(v => console.log(v))
  .catch(err => console.error(err))
