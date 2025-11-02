
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const EncryptedLuckyDrawABI = {
  "abi": [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "index",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "ParticipantRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "index",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "WinnerDrawn",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "drawWinner",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "winnerIndexPlain",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getEncryptedWinnerIndex",
      "outputs": [
        {
          "internalType": "euint32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getEncryptedWinnerName",
      "outputs": [
        {
          "internalType": "euint64",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "index",
          "type": "uint256"
        }
      ],
      "name": "getParticipantAccount",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getParticipantsCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getWinnerAccount",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "protocolId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "externalEuint64",
          "name": "encryptedNameHandle",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "inputProof",
          "type": "bytes"
        }
      ],
      "name": "registerParticipant",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "index",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
} as const;

