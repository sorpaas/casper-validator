const SIMPLE_CASPER_ABI = require("./simple_casper.json");

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

const casper = new web3.eth.Contract(
  SIMPLE_CASPER_ABI,
  "0x0000000000000000000000000000000000000040"
);

const logout = async () => {
  console.log(`\nTrying to log out ...`);

  const validatorIndex = VALIDATOR_INDEX;
  console.log(`Validator index: ${validatorIndex}`);

  const currentEpoch = parseInt(await casper.methods.current_epoch().call());
  console.log(`Current epoch: ${currentEpoch}`);

  const rawMessage = RLP.encode([
    validatorIndex,
    currentEpoch
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
    currentEpoch,
    Buffer.from(signature, "hex")
  ]).toString("hex");

  console.log(await casper.methods.logout(message).send({
    from: `0x${ADDRESS}`,
  }));
};

logout()
  .then(v => console.log(v))
  .catch(err => console.error(err))
