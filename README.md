<div id="top"></div>
<!--
*** Thanks for checking out the Best-README-Template. If you have a suggestion
*** that would make this better, please fork the repo and create a pull request
*** or simply open an issue with the tag "enhancement".
*** Don't forget to give the project a star!
*** Thanks again! Now go create something AMAZING! :D
-->

<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/othneildrew/Best-README-Template">
    <img src="./rd.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Bridge Explorer</h3>

  <p align="center">
   A backend server for the Multichain NFT Bridge Explorer
    <br />
    <a href="https://github.com/XP-NETWORK/bridge-explorer"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="http://bridge-explorer-staging.xp.network.s3-website-eu-west-1.amazonaws.com/">View Explorer (Staging Version)</a>
    ·
    <a href="https://bridge.xp.network/">View Bridge (Main Version)</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

Multichain NFT Bridge Explorer gives the end client an indication of what is happening with his transaction.
</br>
By saving all the transactions data on our mongoDB we are able to serve and display the following information:

- Departure chain name
- Destenation chain name
- Departure hash
- Destenation hash
- Tx-fees
- Tx-value
- Age
- Method
- Status
- Sender address
- Target address
- Nft uri
- Collection name
- Collection contract address
- Token-id

and more....

<strong>THIS IS THE SERVER SIDE</strong>

<p>
On this repo you will find a controller that routs by urls working with a buisness-logic file that connects directly to the DB,
you will find A big file named "listenrs" wich is devided to EVM's and non EVM's.
Each file holds a document that is manages his relevant socket.

there are 2 main socket listeners on each file :
One that is listening to a Freez entry point and another that is listening to a Withdraw, 
these entry point are defined on the contract itself.
</p>

<p align="right">(<a href="#top">back to top</a>)</p>

### Built With

- [Express](https://www.npmjs.com/package/express)
- [Ethers](https://docs.ethers.io/v5/)
- [Taquito- Tezos](https://tezostaquito.io/)
- [Socket-Io](https://socket.io/)
- [Web3-eth](https://web3js.readthedocs.io/en/v1.2.11/web3-eth.html)
- [Tron Web](https://www.npmjs.com/package/tronweb)
- [xpnet-web3-contracts](https://github.com/XP-NETWORK/XP.network-HECO-Migration#dist-erc1155)
- [Mikro Orm](https://mikro-orm.io/)

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

Make sure to go by the following instructions:

### Prerequisites

This is an example of how to list things you need to use the software and how to install them.

- nodeJs
- yarn
- .env File

### Installation

1. make sure you have all prerequisites
2. Clone the repo
   ```sh
   git clone https://github.com/XP-NETWORK/bridge-explorer.git
   ```
3. Install Yarn packages
   ```sh
   yarn install
   ```
4. Insert the .env file to the root dir.
5. on index.ts line 30 change listen to false , and make sure you understand why.
5. run tsc && nodemon src/index.ts.
 

<p align="right">(<a href="#top">back to top</a>)</p>
