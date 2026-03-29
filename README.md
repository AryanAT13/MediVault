# MediVault
### Decentralized Unified Health Ledger 

[Watch the Demo Video Here](https://www.youtube.com/watch?v=uL0gXsj_SDk)

**Resources for Testing:**
* [Sepolia ETH Faucet (Alchemy)](https://www.alchemy.com/faucets/ethereum-sepolia)
* [Sepolia ETH Faucet (Google Web3)](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

---

## Overview

**MediVault** is a unified health ledger designed to solve the critical issues of data fragmentation and privacy in modern healthcare. By leveraging a hybrid Web3 architecture, the platform grants patients absolute sovereign ownership over their medical history while facilitating secure, permissioned interoperability with healthcare providers.

The system utilizes **IPFS** for decentralized storage to ensure data immutability, **Smart Contracts** for granular access control, and integrates **Generative AI** to improve patient health literacy by decoding complex medical reports.

---

## System Design
<img src="https://github.com/AryanAT13/MediVault/raw/main/design.png" alt="System Design">

## Core Objectives & Blockchain Utility

### 1. Data Sovereignty & Privacy
Unlike traditional centralized servers where data breaches are common, MediVault stores records on a distributed peer-to-peer network (IPFS). The patient holds the private keys to their data, ensuring that no central authority can monetize or manipulate their health history.

### 2. Immutable Record Keeping
Medical history is sensitive and must be tamper-proof. By logging record metadata on the Ethereum Sepolia blockchain, we create an immutable audit trail. Once a record hash is minted, it cannot be altered, ensuring the integrity of the patient's medical timeline.

### 3. Granular Access Control & The "Kill Switch"
We replace traditional administrative red tape with automated Smart Contracts. Patients have an absolute "Kill Switch", they can grant or instantly revoke access to specific hospitals. This permissioned architecture ensures that doctors get the data they need during emergencies, but the patient retains the power to lock their vault at any time.

---

## Key Features

### Patient Portal
* **Unified Health Timeline:** A chronological, immutable view of the patient's complete medical history across different providers.
* **AI-Driven Health Literacy:** An integrated AI analysis tool that simplifies complex lab reports and diagnoses into understandable language, empowering patients to make informed health decisions.
* **Active Permissions (The Kill Switch):** A dedicated dashboard interface to monitor exactly which hospitals currently have access. The system automatically resolves complex blockchain addresses into readable hospital names, allowing patients to revoke access on-chain with a single click.

### Hospital & Doctor Portal
* **Verified Practitioner Access:** A secure gateway for medical professionals to request patient data.
* **Patient Search & Retrieval:** Efficient indexing allows doctors to locate patient records via wallet addresses instantly.
* **Emergency Data Access:** Streamlined flow for accessing critical data (Blood Type, Allergies, Chronic Conditions) verified on-chain.

---

## Smart Contract Deployment

The core access control logic is deployed on the **Ethereum Sepolia Testnet**.

* **Network:** Sepolia
* **Contract Address:** `0x67fAB2346ca0b62C159FB8f8c1017c26B93d71f8`
* **Explorer:** [View on Etherscan](https://sepolia.etherscan.io/address/0x67fAB2346ca0b62C159FB8f8c1017c26B93d71f8)

---

## System Architecture

The application follows a secure Hybrid On-Chain/Off-Chain architecture:

1.  **Encryption & Storage:** The medical file is uploaded to the IPFS network via Pinata, generating a unique Content Identifier (CID).
2.  **Immutable Logging:** The CID, along with the timestamp and category, is minted onto the Blockchain via a Smart Contract transaction.
3.  **Access Request:** A doctor initiates a request to view a specific record. This request is logged on the backend database.
4.  **Verification:** The patient approves the request via their wallet. The Smart Contract updates the permission state on the blockchain.
5.  **Data Retrieval:** The application verifies the on-chain permission. If valid, the IPFS CID is fetched and the document is rendered for the doctor.
6.  **Revocation:** At any time, the patient can trigger a smart contract function to flip the permission state to false, instantly locking the doctor out of future data retrievals.

---

## Feedback
If you have any feedback or suggestions, please reach out or open an issue in the repository.
