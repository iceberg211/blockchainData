import { gql } from '@apollo/client';

export const GET_DATA_RECORDS = gql`
  query GetDataRecords($first: Int = 100, $skip: Int = 0) {
    dataRecords(orderBy: timestamp, orderDirection: desc, first: $first, skip: $skip) {
      id
      recordId
      sender
      recipient
      amount
      message
      dataHash
      timestamp
      transactionHash
    }
  }
`;
