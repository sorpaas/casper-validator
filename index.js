const VALIDATION_CODE = "0x603980600c6000396000f30060806000600037602060006080600060006001610bb8f15073<address>6000511460005260206000f3";
const SIMPLE_CASPER_ABI = require("./simple_casper.json");
const PURITY_CHECKER_ABI = require("./purity.json");

const Web3 = require('web3');
const web3 = new Web3("ws://localhost:8546");

const main = async () => {
  console.log(`Deploying validation contract ...`);
  const validationReceipt = await web3.eth.sendTransaction({
    from: "0x00402845B96a30CfB8d49449d4B0159bcEcD1d89",
    data: VALIDATION_CODE.replace("<address>", "00402845b96a30cfb8d49449d4b0159bcecd1d89"),
  });

  const validationAddress = validationReceipt.contractAddress;
  console.log(`Validation contract deployed successfully at address ${validationAddress}.`);

  const purityContract = new web3.eth.Contract(
    PURITY_CHECKER_ABI,
    "0x0000000000000000000000000000000000000041"
  );

  const purityResult = await purityContract.methods["submit(address)"](
    validationAddress
  ).call();
  console.log(`Purity check result: ${purityResult}`);

  const casperContract = new web3.eth.Contract(
    SIMPLE_CASPER_ABI,
    "0x0000000000000000000000000000000000000040"
  );

  const validatorIndex = await casperContract.methods.next_validator_index().call();
  console.log(`Next validator index: ${validatorIndex}`);

  const minDepositSize = await casperContract.methods.MIN_DEPOSIT_SIZE().call();
  console.log(`Min deposit size: ${minDepositSize}`);

  const highestFinalizedEpoch = await casperContract.methods.highest_finalized_epoch(0).call();
  console.log(`Highest finalized epoch: ${highestFinalizedEpoch}`);

  const withdrawalAddress = web3.eth.accounts.create().address;
  console.log(`Depositing to validation address: ${validationAddress}, withdrawal address: ${withdrawalAddress}`);
  const depositReceipt = await casperContract.methods.deposit(
    validationAddress,
    withdrawalAddress,
  ).send({
    from: "0x00402845b96a30cfb8d49449d4b0159bcecd1d89",
    value: web3.utils.toWei("6", "ether"),
  });
  console.log(`Deposit result: ${depositReceipt.status}.`);

};

main()
  .then(v => console.log(v))
  .catch(err => console.error(err))
