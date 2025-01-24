import { useState } from 'react';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
} from '@chakra-ui/react';
import { LAUNCHPAD_ABI } from '../constants/abi';

export function ProjectCreation() {
  const { library, account } = useWeb3React();
  const [formData, setFormData] = useState({
    tokenAddress: '',
    tokenPrice: '',
    softCap: '',
    hardCap: '',
    startTime: '',
    endTime: '',
  });

  const createProject = async () => {
    try {
      const signer = library.getSigner();
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_LAUNCHPAD_ADDRESS,
        LAUNCHPAD_ABI,
        signer
      );

      const tx = await contract.createPool(
        formData.tokenAddress,
        ethers.utils.parseEther(formData.tokenPrice),
        ethers.utils.parseEther(formData.softCap),
        ethers.utils.parseEther(formData.hardCap),
        Math.floor(new Date(formData.startTime).getTime() / 1000),
        Math.floor(new Date(formData.endTime).getTime() / 1000)
      );

      await tx.wait();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <Box maxW="xl" mx="auto" mt={8}>
      <VStack spacing={4}>
        <FormControl>
          <FormLabel>Token Address</FormLabel>
          <Input
            value={formData.tokenAddress}
            onChange={(e) =>
              setFormData({ ...formData, tokenAddress: e.target.value })
            }
          />
        </FormControl>
        {/* Add other form fields */}
        <Button onClick={createProject}>Create Project</Button>
      </VStack>
    </Box>
  );
}