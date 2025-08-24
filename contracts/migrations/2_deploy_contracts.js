const DataStorage = artifacts.require("DataStorage");

module.exports = function (deployer, network, accounts) {
  console.log("Deploying to network:", network);
  console.log("Deployer account:", accounts[0]);
  
  deployer.deploy(DataStorage).then(() => {
    console.log("DataStorage deployed at:", DataStorage.address);
    console.log("Transaction hash:", DataStorage.transactionHash);
  });
};
