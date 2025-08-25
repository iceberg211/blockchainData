import { gql } from '@apollo/client';

export const GET_DATA_RECORDS = gql`
  query GetDataRecords {
    dataRecords(orderBy: timestamp, orderDirection: desc) {
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

