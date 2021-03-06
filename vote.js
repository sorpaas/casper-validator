const SIMPLE_CASPER_ABI = require("./simple_casper.json");
const PURITY_CHECKER_ABI = require("./purity.json");

const Web3 = require("web3");
const RLP = require("rlp");
const secp256k1 = require('secp256k1');
const web3 = new Web3("ws://localhost:8546");

let ADDRESS = process.env["ADDRESS"].toLowerCase();
if (ADDRESS.startsWith("0x")) {
  ADDRESS = ADDRESS.substring(2);
}

let PRIVATE_KEY = process.env["PRIVATE_KEY"].toLowerCase();
if (PRIVATE_KEY.startsWith("0x")) {
  PRIVATE_KEY = PRIVATE_KEY.substring(2);
}

const VALIDATOR_INDEX = parseInt(process.env["VALIDATOR_INDEX"]);

web3.extend({
  property: "parity",
  methods: [{
    name: "sendUnsignedTransaction",
    call: "parity_sendUnsignedTransaction",
    params: 2,
    inputFormatter: [web3.extend.formatters.inputAddressFormatter, null],
  }],
});

const EPOCH_LENGTH = 50;
const NON_REVERT_MIN_DEPOSITS = web3.utils.toWei("1", "ether");

const casper = new web3.eth.Contract(
  SIMPLE_CASPER_ABI,
  "0x0000000000000000000000000000000000000040"
);

const vote = async () => {
  console.log(`\nStart voting round ...`);

  const validatorIndex = VALIDATOR_INDEX;
  console.log(`Validator index: ${validatorIndex}`);

  const startDynasty = parseInt(await casper.methods.validators__start_dynasty(validatorIndex).call());
  const currentDynasty = parseInt(await casper.methods.dynasty().call());
  console.log(`Dynasty start: ${startDynasty}, current: ${currentDynasty}`);
  if (startDynasty > currentDynasty) {
    return;
  }

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

  const data = casper.methods.vote(message).encodeABI();
  console.log(`Unsigned transaction data: ${data}`);

  console.log(await web3.parity.sendUnsignedTransaction(
    "0x0000000000000000000000000000000000000040",
    data
  ));
};

const main = async () => {
  let lastEpoch = -1;

  while (true) {
    const currentEpoch = parseInt(await casper.methods.current_epoch().call());
    const currentBlockNumber = await web3.eth.getBlockNumber();

    if (currentEpoch != lastEpoch && (currentBlockNumber % EPOCH_LENGTH) >= (EPOCH_LENGTH / 2)) {
      await vote();
      lastEpoch = currentEpoch;
    }
  }
};

main()
  .then(v => console.log(v))
  .catch(err => console.error(err))
