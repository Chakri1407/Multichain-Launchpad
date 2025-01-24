import { useEffect, useState } from 'react';
import { useWeb3React } from '@web3-react/core';
import { Box, Grid, Heading, Text } from '@chakra-ui/react';
import { gql, useQuery } from '@apollo/client';

const PROJECTS_QUERY = gql`
  query GetActiveProjects {
    projects(where: { active: true }) {
      id
      tokenPrice
      softCap
      hardCap
      totalRaised
      startTime
      endTime
    }
  }
`;

export function ProjectDashboard() {
  const { data, loading } = useQuery(PROJECTS_QUERY);
  const [wsData, setWsData] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setWsData(update);
    };
    return () => ws.close();
  }, []);

  if (loading) return <Text>Loading...</Text>;

  return (
    <Box p={8}>
      <Heading mb={6}>Active Projects</Heading>
      <Grid templateColumns="repeat(3, 1fr)" gap={6}>
        {data?.projects.map((project) => (
          <Box
            key={project.id}
            p={6}
            border="1px"
            borderColor="gray.200"
            borderRadius="md"
          >
            <Text>Raised: {ethers.utils.formatEther(project.totalRaised)} ETH</Text>
            <Text>Hard Cap: {ethers.utils.formatEther(project.hardCap)} ETH</Text>
            {/* Add other project details */}
          </Box>
        ))}
      </Grid>
    </Box>
  );
}