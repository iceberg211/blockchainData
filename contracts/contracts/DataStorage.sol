// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DataStorage
 * @dev 数据上链存储合约，支持事件日志机制
 */
contract DataStorage is Ownable, ReentrancyGuard {
    
    // 数据记录结构
    struct DataRecord {
        uint256 id;
        address sender;
        address recipient;
        uint256 amount;
        string message;
        uint256 timestamp;
        bytes32 dataHash;
    }
    
    // 状态变量
    uint256 private _recordCounter;
    mapping(uint256 => DataRecord) public records;
    mapping(address => uint256[]) public userRecords;
    mapping(bytes32 => bool) public dataHashes;
    
    // 事件定义
    event DataStored(
        uint256 indexed recordId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        string message,
        bytes32 dataHash,
        uint256 timestamp
    );
    
    event EtherReceived(
        address indexed sender,
        uint256 amount,
        uint256 timestamp
    );
    
    event DataUpdated(
        uint256 indexed recordId,
        address indexed updater,
        string newMessage,
        uint256 timestamp
    );
    
    // 修饰符
    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        _;
    }
    
    modifier recordExists(uint256 _recordId) {
        require(_recordId > 0 && _recordId <= _recordCounter, "Record does not exist");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        _recordCounter = 0;
    }
    
    /**
     * @dev 存储数据记录
     * @param _recipient 接收方地址
     * @param _message 数据消息
     */
    function storeData(
        address _recipient,
        string memory _message
    ) external payable validAddress(_recipient) nonReentrant {
        require(bytes(_message).length > 0, "Message cannot be empty");
        
        _recordCounter++;
        bytes32 dataHash = keccak256(abi.encodePacked(
            msg.sender,
            _recipient,
            msg.value,
            _message,
            block.timestamp,
            _recordCounter
        ));
        
        // 防止重复数据
        require(!dataHashes[dataHash], "Duplicate data");
        
        DataRecord memory newRecord = DataRecord({
            id: _recordCounter,
            sender: msg.sender,
            recipient: _recipient,
            amount: msg.value,
            message: _message,
            timestamp: block.timestamp,
            dataHash: dataHash
        });
        
        records[_recordCounter] = newRecord;
        userRecords[msg.sender].push(_recordCounter);
        userRecords[_recipient].push(_recordCounter);
        dataHashes[dataHash] = true;
        
        // 如果有 ETH 转账，转给接收方
        if (msg.value > 0) {
            payable(_recipient).transfer(msg.value);
        }
        
        emit DataStored(
            _recordCounter,
            msg.sender,
            _recipient,
            msg.value,
            _message,
            dataHash,
            block.timestamp
        );
    }
    
    /**
     * @dev 批量存储数据
     * @param _recipients 接收方地址数组
     * @param _amounts 金额数组
     * @param _messages 消息数组
     */
    function batchStoreData(
        address[] memory _recipients,
        uint256[] memory _amounts,
        string[] memory _messages
    ) external payable nonReentrant {
        require(
            _recipients.length == _amounts.length && 
            _amounts.length == _messages.length,
            "Arrays length mismatch"
        );
        require(_recipients.length > 0, "Empty arrays");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }
        require(msg.value >= totalAmount, "Insufficient ETH sent");
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Invalid recipient address");
            require(bytes(_messages[i]).length > 0, "Message cannot be empty");
            
            _recordCounter++;
            bytes32 dataHash = keccak256(abi.encodePacked(
                msg.sender,
                _recipients[i],
                _amounts[i],
                _messages[i],
                block.timestamp,
                _recordCounter
            ));
            
            DataRecord memory newRecord = DataRecord({
                id: _recordCounter,
                sender: msg.sender,
                recipient: _recipients[i],
                amount: _amounts[i],
                message: _messages[i],
                timestamp: block.timestamp,
                dataHash: dataHash
            });
            
            records[_recordCounter] = newRecord;
            userRecords[msg.sender].push(_recordCounter);
            userRecords[_recipients[i]].push(_recordCounter);
            dataHashes[dataHash] = true;
            
            if (_amounts[i] > 0) {
                payable(_recipients[i]).transfer(_amounts[i]);
            }
            
            emit DataStored(
                _recordCounter,
                msg.sender,
                _recipients[i],
                _amounts[i],
                _messages[i],
                dataHash,
                block.timestamp
            );
        }
        
        // 退还多余的 ETH
        if (msg.value > totalAmount) {
            payable(msg.sender).transfer(msg.value - totalAmount);
        }
    }
    
    /**
     * @dev 更新数据记录的消息（仅发送方可操作）
     * @param _recordId 记录ID
     * @param _newMessage 新消息
     */
    function updateMessage(
        uint256 _recordId,
        string memory _newMessage
    ) external recordExists(_recordId) {
        require(
            records[_recordId].sender == msg.sender,
            "Only sender can update message"
        );
        require(bytes(_newMessage).length > 0, "Message cannot be empty");
        
        records[_recordId].message = _newMessage;
        
        emit DataUpdated(_recordId, msg.sender, _newMessage, block.timestamp);
    }
    
    /**
     * @dev 获取记录详情
     * @param _recordId 记录ID
     */
    function getRecord(uint256 _recordId) 
        external 
        view 
        recordExists(_recordId) 
        returns (DataRecord memory) 
    {
        return records[_recordId];
    }
    
    /**
     * @dev 获取用户的所有记录ID
     * @param _user 用户地址
     */
    function getUserRecords(address _user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userRecords[_user];
    }
    
    /**
     * @dev 获取总记录数
     */
    function getTotalRecords() external view returns (uint256) {
        return _recordCounter;
    }
    
    /**
     * @dev 获取最近的记录
     * @param _limit 限制数量
     */
    function getRecentRecords(uint256 _limit) 
        external 
        view 
        returns (DataRecord[] memory) 
    {
        uint256 limit = _limit > _recordCounter ? _recordCounter : _limit;
        DataRecord[] memory recentRecords = new DataRecord[](limit);
        
        for (uint256 i = 0; i < limit; i++) {
            recentRecords[i] = records[_recordCounter - i];
        }
        
        return recentRecords;
    }
    
    /**
     * @dev 接收 ETH 的回退函数
     */
    receive() external payable {
        emit EtherReceived(msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * @dev 紧急提取合约中的 ETH（仅所有者）
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        payable(owner()).transfer(balance);
    }
}
