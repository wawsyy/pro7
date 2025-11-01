// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted Lucky Draw
/// @author Encrypted Lucky Draw
/// @notice Fully homomorphic encrypted lucky draw where participant names remain encrypted on-chain.
contract EncryptedLuckyDraw is SepoliaConfig {
    struct Participant {
        euint64 secretName;
        address account;
    }

    Participant[] private participants;
    euint64 private lastWinnerName;
    euint32 private lastWinnerIndex;
    address private lastWinnerAccount;
    bool private hasWinner;

    event ParticipantRegistered(uint256 indexed index, address indexed account);
    event WinnerDrawn(uint256 indexed index, address indexed account);

    /// @notice Register a participant with an encrypted name.
    /// @param encryptedNameHandle The encrypted name handle returned by the relayer.
    /// @param inputProof The relayer attested proof for the encrypted input.
    /// @return index The index assigned to the participant.
    function registerParticipant(
        externalEuint64 encryptedNameHandle,
        bytes calldata inputProof
    ) external returns (uint256 index) {
        euint64 encryptedName = FHE.fromExternal(encryptedNameHandle, inputProof);

        FHE.allowThis(encryptedName);
        FHE.allow(encryptedName, msg.sender);

        participants.push(Participant({secretName: encryptedName, account: msg.sender}));
        index = participants.length - 1;

        // Once a new participant registers, a previous draw is no longer considered final.
        hasWinner = false;

        emit ParticipantRegistered(index, msg.sender);
    }

    /// @notice Return total number of registered participants.
    function getParticipantsCount() external view returns (uint256) {
        return participants.length;
    }

    /// @notice Draw a winner using on-chain randomness and publish encrypted results.
    /// @dev Anyone can trigger the draw for demo purposes. A production system should restrict this.
    /// @return winnerIndexPlain The plaintext index of the winner to power follow-up off-chain flows.
    function drawWinner() external returns (uint256 winnerIndexPlain) {
        uint256 total = participants.length;
        require(total > 1, "Need at least two participants");

        bytes32 seed = keccak256(
            abi.encodePacked(block.timestamp, block.prevrandao, blockhash(block.number - 1), address(this), total)
        );
        winnerIndexPlain = uint32(uint256(seed) % total);

        Participant storage winner = participants[winnerIndexPlain];

        lastWinnerAccount = winner.account;
        lastWinnerName = winner.secretName;
        lastWinnerIndex = FHE.asEuint32(uint32(winnerIndexPlain));
        hasWinner = true;

        FHE.allowThis(lastWinnerName);
        FHE.allowThis(lastWinnerIndex);

        FHE.allow(lastWinnerName, msg.sender);
        FHE.allow(lastWinnerIndex, msg.sender);

        for (uint256 i = 0; i < total; i++) {
            FHE.allow(lastWinnerName, participants[i].account);
            FHE.allow(lastWinnerIndex, participants[i].account);
        }

        emit WinnerDrawn(winnerIndexPlain, lastWinnerAccount);
    }

    /// @notice Retrieve the encrypted winner name.
    /// @dev Participants already have permission to decrypt after drawWinner executes.
    function getEncryptedWinnerName() external view returns (euint64) {
        require(hasWinner, "No winner yet");
        return lastWinnerName;
    }

    /// @notice Retrieve the encrypted winner index.
    /// @dev Participants already have permission to decrypt after drawWinner executes.
    function getEncryptedWinnerIndex() external view returns (euint32) {
        require(hasWinner, "No winner yet");
        return lastWinnerIndex;
    }

    /// @notice Retrieve the plaintext account address for the most recent winner.
    function getWinnerAccount() external view returns (address) {
        require(hasWinner, "No winner yet");
        return lastWinnerAccount;
    }

    /// @notice Return the account address for a participant at index.
    function getParticipantAccount(uint256 index) external view returns (address) {
        require(index < participants.length, "Index out of range");
        return participants[index].account;
    }
}
