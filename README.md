# MediVault
### Decentralized Unified Health Ledger & Patient Data Sovereignty

MediVault:https://medivault-two.vercel.app/

Sepolia Faucet:https://www.alchemy.com/faucets/ethereum-sepolia

Google Web3 Faucet:https://cloud.google.com/application/web3/faucet/ethereum/sepolia

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

### 3. Granular Access Control
We replace traditional administrative red tape with automated Smart Contracts. Patients can grant or revoke access to specific hospitals instantly. This permissioned architecture ensures that doctors get the data they need during emergencies without compromising the patient's long-term privacy.

---

## Key Features

### Patient Portal
* **Unified Health Timeline:** A chronological, immutable view of the patient's complete medical history across different providers.
* **AI-Driven Health Literacy:** An integrated AI analysis tool (Gemini) that simplifies complex lab reports and diagnoses into understandable language, empowering patients to make informed health decisions.
* **Permission Management:** A dashboard to view active access grants and revoke permissions for previous healthcare providers in real-time.

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
3.  **Access Request:** A doctor initiates a request to view a specific record. This request is logged on the backend.
4.  **Verification:** The patient approves the request via their wallet. The Smart Contract updates the permission state on the blockchain.
5.  **Data Retrieval:** The application verifies the on-chain permission. If valid, the IPFS CID is fetched and the document is rendered for the doctor.

---

## Feedback
If you have any feedback or suggestions, please reach out or open an issue in the repository.
