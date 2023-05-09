import { ethers } from "ethers";
import React, { useState } from "react";
// import the contract ABI to be deployed
import ERC721JSON from "./api/ERC721JSON.js";
// import contract byteCode
import bytecode from "./api/bytecode";
// import axios
const httpRequest = require("axios");

export default function Home() {

  // import the required states to be used in the project
  const [provider, setProvider] = useState("");
  const [network, setNetwork] = useState("");
  const [signer, setSigner] = useState("");
  const [nftName, setNftName] = useState("");
  const [nftSymbol, setNftSymbol] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [nftImage, setNftImage] = useState(null);
  const [nftImageHash, setNftImageHash] = useState("");
  const [files, setFiles] = useState("");
  const [deployedAddress, setDeployedAddress] = useState("");
  const [contractDeployed, setContractDeployed] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [createJSON, setCreateJSON] = useState(false);
  const [mintNft, setMintNft] = useState(false);

 // Setting a constant to disable image upload if nftDescription is empty

  const isImageUploadDisabled = nftDescription === "";

  // create a handler function for setting NFT Name

  const handleNftName = (event) => {
    setNftName(event.target.value);
    console.log(event.target.value);
  };

  // create a handler function for setting NFT Symbol

  const handleNftSymbol = (event) => {
    setNftSymbol(event.target.value);
    console.log(event.target.value);
  };

  // create a handler function for setting NFT Description

  const handleNftDescription = (event) => {
    setNftDescription(event.target.value);
    console.log(event.target.value);
  };

  // create a handler function to retrieve the selected file and convert it to a buffer then finally upload to pinata

  const retrieveFile = (event) => {
    const data = event.target.files[0];
    const reader = new window.FileReader();
    reader.readAsArrayBuffer(data);

    reader.onloadend = async () => {
      const fileBuffer = Buffer(reader.result);
      console.log("Buffer Data: ", Buffer(reader.result));
      setNftImage(fileBuffer);

      const formData = new FormData();
      formData.append(
        "file",
        new Blob([fileBuffer], {
          fileName: data.name,
          contentType: data.type,
        })
      );

      try {
        // Make a POST request to the Pinata API to pin the file to IPFS
        const response = await httpRequest.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              pinata_api_key: "ece57e16025748f108b3",
              pinata_secret_api_key:
                "6bd7793c23bda8098c3233fab33cefc9d88a9e301775a46b6db23f787384f45a",
            },
          }
        );

        console.log("Pinata Response: ", response.data);
        console.log("Pinata Response IPFS: ", response.data.IpfsHash);
        const ipfsHashTest = response.data.IpfsHash;
        console.log(ipfsHashTest);
        // Set the IPFS hash in state
        setNftImageHash(ipfsHashTest);
        console.log("Na here i dey: ", ipfsHashTest);
        // Call the createJSONFile function to create the NFT metadata file
        createJSONFile(ipfsHashTest);
      } catch (error) {
        console.log("Pinata Error: ", error);
      }

      event.preventDefault();
    };
  };

  // create a .json file with the inputed nft details

  const createJSONFile = async (nftImageHash) => {
    // trying to be sure my nftImageHash is accessible inside this block
    console.log("inside createJSON: ", nftImageHash);
    // Create metadata object
    const metaData = {
      name: nftName,
      description: nftDescription,
      image: `https://gateway.pinata.cloud/ipfs/${nftImageHash}`,
    };

    // Convert metadata object to JSON format
    const fileContent = JSON.stringify(metaData, null, 2);

    // Create a File object with the JSON content
    const file = new File([fileContent], `${nftName}.json`, {
      type: "application/json",
    });

    const formData = new FormData();
    formData.append("file", file);
    console.log(fileContent);

    try {
      const response = await httpRequest.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            pinata_api_key: "ece57e16025748f108b3",
            pinata_secret_api_key:
              "6bd7793c23bda8098c3233fab33cefc9d88a9e301775a46b6db23f787384f45a",
          },
        }
      );

      console.log("Pinata Response: ", response.data);
      console.log("Pinata Response: ", response.data.IpfsHash);
      setFiles(response.data.IpfsHash);
      setCreateJSON(true);
    } catch (error) {
      console.log("Pinata JSON Error: ", error);
    }
  };

  async function connectWallet() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      setSigner(signer);
      setProvider(provider);
      setNetwork(network);
      console.log(await signer.getAddress());
      console.log(network);
      console.log(provider);
    } catch (error) {
      console.log("Error Message: ", error);
    }
  }

  async function deployContract(event) {
    event.preventDefault();
    setDeployLoading(true);

    if (!provider || !network) {
      console.log("Please connect your wallet before deploying the contract");
      return;
    }

    try {
      const factory = new ethers.ContractFactory(ERC721JSON, bytecode, signer);
      const name = nftName;
      const symbol = nftSymbol;
      const baseTokenURI = "https://gateway.pinata.cloud/ipfs/";
      const contract = await factory.deploy(name, symbol, baseTokenURI);
      await contract.deployed();
      setDeployedAddress(contract.address);
      const deployedAddress = contract.address;
      console.log(deployedAddress);
      setContractDeployed(true);
      setDeployLoading(false);
    } catch (error) {
      console.log(error);
      setDeployLoading(false);
    }
  }

  async function safeMint(event) {
    event.preventDefault();
    setMintNft(true);

    if (!provider || !network) {
      console.log("Please connect your wallet before deploying the contract");
      return;
    }

    const contract = new ethers.Contract(deployedAddress, ERC721JSON, signer);
    const ownerOfNft = await contract.owner();

    console.log(files);
    console.log(ownerOfNft);

    const mintNft = await contract.safeMint(ownerOfNft, files);
    console.log(mintNft);
  }

  return (
    <main className="flex min-h-screen flex-col bg-gray-100">
      <header className="flex items-center justify-between w-full py-6 px-8">
        <h1 className="text-2xl font-bold text-blue-500">Mint NFT</h1>
        {provider && network ? (
          <p className="text-gray-700 mb-2">
            Wallet Connected to {network.name} network
          </p>
        ) : (
          <button
            className="bg-gradient-to-br from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-black rounded-md py-2 px-4"
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        )}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-md shadow-lg">
          <form onSubmit={deployContract}>
            <div className="mb-4">
              <label
                className="block text-gray-700 font-bold mb-2"
                htmlFor="name"
              >
                NFT Name
              </label>
              <input
                className="border rounded-md py-2 px-3 text-gray-700 w-full"
                type="text"
                placeholder="Enter NFT Name"
                id="name"
                onChange={handleNftName}
              />
            </div>
            <div className="mb-4">
              <label
                className="block text-gray-700 font-bold mb-2"
                htmlFor="symbol"
              >
                NFT Symbol
              </label>
              <input
                className="border rounded-md py-2 px-3 text-gray-700 w-full"
                type="text"
                placeholder="Enter NFT Symbol"
                id="symbol"
                onChange={handleNftSymbol}
              />
            </div>
            <button
              className="bg-gradient-to-br from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-black font-bold rounded-md py-2 px-4 shadow-md"
              type="submit"
            >
              {deployLoading ? "Deploying..." : "Deploy Contract"}
            </button>
          </form>
          {contractDeployed && (
            <form
              className="max-w-md w-full bg-white p-8 rounded-md shadow-lg"
              onSubmit={safeMint}
            >
              <div className="mb-4">
                <label
                  className="block text-gray-700 font-bold mb-2"
                  htmlFor="description"
                >
                  NFT Description:
                </label>
                <input
                  className="border rounded-md py-2 px-3 text-gray-700 w-full"
                  type="text"
                  placeholder="Enter NFT Description"
                  onChange={handleNftDescription}
                />
              </div>
              <div className="mb-4">
                <label
                  className="block text-gray-700 font-bold mb-2"
                  htmlFor="image"
                >
                  NFT Image:
                </label>
                <input
                  className="border rounded-md py-2 px-3 text-gray-700 w-full"
                  type="file"
                  accept="image/*"
                  id="image-upload"
                  onChange={retrieveFile}
                  disabled={isImageUploadDisabled}
                />
              </div>
              <button
                className="bg-gradient-to-br from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-black font-bold rounded-md py-2 px-4 shadow-md"
                type="submit"
                disabled={!createJSON}
              >
                {mintNft ? "minting..." : "Mint Nft"}
              </button>
              <div className="mt-4">
                <span className="text-gray-700 font-bold">
                  Deployed Contract Address:{" "}
                </span>
                <span className="text-gray-700">{deployedAddress}</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
