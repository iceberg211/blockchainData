import { BigInt } from "@graphprotocol/graph-ts"
import {
  DataStorage,
  DataStored
} from "../generated/DataStorage/DataStorage"
import { DataRecord } from "../generated/schema"

export function handleDataStored(event: DataStored): void {
  // 创建一个新的 DataRecord 实体
  // ID 设置为 交易哈希-日志索引，确保唯一性
  let entity = new DataRecord(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )

  // 从事件参数中填充实体字段
  entity.recordId = event.params.recordId
  entity.sender = event.params.sender
  entity.recipient = event.params.recipient
  entity.amount = event.params.amount
  entity.message = event.params.message
  entity.dataHash = event.params.dataHash
  entity.timestamp = event.params.timestamp

  // 添加区块元数据
  entity.blockNumber = event.block.number
  entity.transactionHash = event.transaction.hash

  // 保存实体
  entity.save()
}

