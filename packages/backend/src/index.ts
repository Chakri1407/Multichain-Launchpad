// src/index.ts
import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { createAlchemyWeb3 } from '@alch/alchemy-web3';
import { Connection } from '@solana/web3.js';
import { LzSdk } from '@layerzerolabs/sdk';
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize providers
const ethereumProvider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
const solanaConnection = new Connection(process.env.SOLANA_RPC_URL);
const web3 = createAlchemyWeb3(process.env.ALCHEMY_URL);

// Initialize The Graph client
const graphClient = new ApolloClient({
  uri: process.env.GRAPH_API_URL,
  cache: new InMemoryCache(),
});

// Auth middleware for signature verification
const verifySignature = async (req, res, next) => {
  try {
    const { signature, message, address } = req.headers;
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Project details endpoint
app.get('/api/projects/:chainId/:projectId', async (req, res) => {
  try {
    const { chainId, projectId } = req.params;
    
    const query = gql`
      query GetProject($id: ID!) {
        project(id: $id) {
          id
          tokenPrice
          softCap
          hardCap
          startTime
          endTime
          totalRaised
        }
      }
    `;

    const { data } = await graphClient.query({
      query,
      variables: { id: projectId },
    });

    res.json(data.project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project details' });
  }
});

// User contributions endpoint
app.get('/api/contributions/:chainId/:address', verifySignature, async (req, res) => {
  try {
    const { chainId, address } = req.params;
    
    const query = gql`
      query GetUserContributions($address: String!) {
        contributions(where: { investor: $address }) {
          id
          amount
          timestamp
          project {
            id
            tokenPrice
          }
        }
      }
    `;

    const { data } = await graphClient.query({
      query,
      variables: { address: address.toLowerCase() },
    });

    res.json(data.contributions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

// LayerZero cross-chain messaging endpoint
app.post('/api/bridge', verifySignature, async (req, res) => {
  try {
    const { srcChainId, destChainId, amount } = req.body;
    const lzSdk = new LzSdk(process.env.LZ_ENDPOINT);
    
    const messageFee = await lzSdk.estimateMessageFee(srcChainId, destChainId);
    
    res.json({
      messageFee,
      endpoint: lzSdk.endpoint,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process bridge request' });
  }
});

// Set up Alchemy webhooks for Ethereum events
app.post('/webhook/ethereum', async (req, res) => {
  const { event } = req.body;
  // Process event and emit to connected websocket clients
  console.log('Ethereum event:', event);
  res.status(200).send();
});

// Initialize WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  // Set up Solana account subscription
  const subscriptionId = solanaConnection.onAccountChange(
    new PublicKey(process.env.PROGRAM_ID),
    (accountInfo, context) => {
      ws.send(JSON.stringify({
        type: 'SOLANA_UPDATE',
        data: accountInfo,
        slot: context.slot,
      }));
    },
  );

  ws.on('close', () => {
    solanaConnection.removeAccountChangeListener(subscriptionId);
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});