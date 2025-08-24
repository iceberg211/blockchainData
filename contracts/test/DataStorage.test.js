const DataStorage = artifacts.require("DataStorage");

contract("DataStorage", (accounts) => {
  let dataStorage;
  const [owner, sender, recipient] = accounts;

  beforeEach(async () => {
    dataStorage = await DataStorage.new({ from: owner });
  });

  describe("基础功能测试", () => {
    it("应该正确部署合约", async () => {
      assert.ok(dataStorage.address);
      const totalRecords = await dataStorage.getTotalRecords();
      assert.equal(totalRecords.toNumber(), 0);
    });

    it("应该能够存储数据", async () => {
      const message = "测试数据存储";
      const amount = web3.utils.toWei("0.1", "ether");

      const tx = await dataStorage.storeData(recipient, message, {
        from: sender,
        value: amount
      });

      // 检查事件
      const event = tx.logs[0];
      assert.equal(event.event, "DataStored");
      assert.equal(event.args.sender, sender);
      assert.equal(event.args.recipient, recipient);
      assert.equal(event.args.amount.toString(), amount);
      assert.equal(event.args.message, message);

      // 检查记录
      const totalRecords = await dataStorage.getTotalRecords();
      assert.equal(totalRecords.toNumber(), 1);

      const record = await dataStorage.getRecord(1);
      assert.equal(record.sender, sender);
      assert.equal(record.recipient, recipient);
      assert.equal(record.amount.toString(), amount);
      assert.equal(record.message, message);
    });

    it("应该能够更新消息", async () => {
      const message = "原始消息";
      const newMessage = "更新后的消息";

      await dataStorage.storeData(recipient, message, { from: sender });
      
      await dataStorage.updateMessage(1, newMessage, { from: sender });
      
      const record = await dataStorage.getRecord(1);
      assert.equal(record.message, newMessage);
    });

    it("应该能够获取用户记录", async () => {
      await dataStorage.storeData(recipient, "消息1", { from: sender });
      await dataStorage.storeData(recipient, "消息2", { from: sender });

      const senderRecords = await dataStorage.getUserRecords(sender);
      const recipientRecords = await dataStorage.getUserRecords(recipient);

      assert.equal(senderRecords.length, 2);
      assert.equal(recipientRecords.length, 2);
    });
  });

  describe("权限控制测试", () => {
    it("只有发送方可以更新消息", async () => {
      await dataStorage.storeData(recipient, "测试消息", { from: sender });

      try {
        await dataStorage.updateMessage(1, "恶意更新", { from: recipient });
        assert.fail("应该抛出错误");
      } catch (error) {
        assert(error.message.includes("Only sender can update message"));
      }
    });

    it("不能存储空消息", async () => {
      try {
        await dataStorage.storeData(recipient, "", { from: sender });
        assert.fail("应该抛出错误");
      } catch (error) {
        assert(error.message.includes("Message cannot be empty"));
      }
    });
  });

  describe("批量操作测试", () => {
    it("应该能够批量存储数据", async () => {
      const recipients = [accounts[1], accounts[2], accounts[3]];
      const amounts = [
        web3.utils.toWei("0.1", "ether"),
        web3.utils.toWei("0.2", "ether"),
        web3.utils.toWei("0.3", "ether")
      ];
      const messages = ["消息1", "消息2", "消息3"];
      const totalAmount = web3.utils.toWei("0.6", "ether");

      await dataStorage.batchStoreData(recipients, amounts, messages, {
        from: sender,
        value: totalAmount
      });

      const totalRecords = await dataStorage.getTotalRecords();
      assert.equal(totalRecords.toNumber(), 3);
    });
  });
});
