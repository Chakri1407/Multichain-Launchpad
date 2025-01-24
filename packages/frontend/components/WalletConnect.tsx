import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { Button } from '@chakra-ui/react';

const injected = new InjectedConnector({
  supportedChainIds: [1, 56], // Ethereum and BSC
});

export function WalletConnect() {
  const { activate, active, account } = useWeb3React();

  const connect = async () => {
    try {
      await activate(injected);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  return (
    <Button
      onClick={connect}
      disabled={active}
    >
      {active ? `Connected: ${account.substring(0, 6)}...` : 'Connect Wallet'}
    </Button>
  );
}