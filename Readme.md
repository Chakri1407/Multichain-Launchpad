# 🌍 Multichain Launchpad

## 🚀 Overview
The **Multichain Launchpad** facilitates fundraising across **Ethereum and Solana**, ensuring seamless interoperability. It allows project creators to raise funds efficiently with a **minimal UI** and supports cross-chain token transfers using **LayerZero** and **Wormhole**.

## 📌 Features
### ✅ Smart Contracts (Ethereum & Solana)
- **Fundraising pools** with fixed-price token sales.
- **Linear vesting** for controlled token distribution.
- **Governance voting** for community-driven decisions.
- **Cross-chain interoperability** via **LayerZero** & **Wormhole**.

### ✅ Backend (Stateless, No Database)
- **MetaMask authentication** (Ethereum `personal_sign`).
- **Alchemy Webhooks** for blockchain event monitoring (if needed).
- **The Graph** for blockchain data indexing (instead of a database).
- **Stateless API** fetching on-chain data dynamically.

### ✅ Frontend (Minimal UI, React + Next.js)
- **Project creation form** for launching fundraising campaigns.
- **Token sale dashboard** displaying real-time project data.
- **Wallet connection UI** supporting MetaMask & WalletConnect.
- **Contribution tracking** based on blockchain transactions.

## 🛠️ Tech Stack
| **Component**   | **Technology Used** |
|---------------|------------------|
| **Smart Contracts** | Solidity (Ethereum), Rust (Solana - Anchor) |
| **Backend** | Node.js, Express, Web3.js, ethers.js, LayerZero SDK |
| **Frontend** | React, Next.js, Tailwind CSS, Chakra UI |
| **Indexing** | The Graph |
| **Event Monitoring** | Alchemy Webhooks |
| **Interoperability** | LayerZero, Wormhole |

## 📜 Deployment & Testing
### **Ethereum (Hardhat)**
```sh
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network sepolia
```

### **Solana (Anchor Framework)**
```sh
anchor build
anchor test
solana program deploy target/deploy/launchpad.so
```

## 📂 Project Structure
📦 multichain-launchpad
├── packages/
│   ├── ethereum/          # Ethereum smart contracts
│   ├── solana/           # Solana programs
│   ├── frontend/         # Next.js web app
│   └── backend/          # Express.js server

## 📌 Additional Notes
- No centralized database; all data is stored on-chain and indexed using **The Graph**.
- Stateless backend fetching blockchain data dynamically.
- Designed for scalability with cross-chain functionality.

## 📧 Contact & Contributions
Have ideas or contributions? Feel free to reach out! 🚀

---
```


