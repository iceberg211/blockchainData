import { ApolloClient, InMemoryCache } from '@apollo/client';

// 这是您的子图部署成功后，在 The Graph Studio 仪表板中找到的查询URL
// 格式通常是: https://api.thegraph.com/subgraphs/name/<USERNAME>/<SUBGRAPH_NAME>
const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/119316/datastorage/v.0.0.1';

export const apolloClient = new ApolloClient({
  uri: SUBGRAPH_URL,
  cache: new InMemoryCache(),
});

