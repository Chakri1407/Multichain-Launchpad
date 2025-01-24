import { ChakraProvider } from '@chakra-ui/react';
import { WalletProvider } from '@solana/wallet-adapter-react';
import { Web3ReactProvider } from '@web3-react/core';
import { ethers } from 'ethers';

function getLibrary(provider) {
  return new ethers.providers.Web3Provider(provider);
}

function MyApp({ Component, pageProps }) {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <WalletProvider>
        <ChakraProvider>
          <Component {...pageProps} />
        </ChakraProvider>
      </WalletProvider>
    </Web3ReactProvider>
  );
}

export default MyApp;