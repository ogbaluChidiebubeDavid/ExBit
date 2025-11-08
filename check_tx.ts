import { ethers } from 'ethers';

const ALCHEMY_KEY = process.env.ALCHEMY_BASE_API_KEY;
const provider = new ethers.JsonRpcProvider(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`);
const txHash = '0x9ca8540004ddceb9dd26ed51d680c141b8a118e74e220577a4374a6dc099a57c';

async function checkTx() {
  try {
    const tx = await provider.getTransaction(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    
    console.log('=== TRANSACTION DETAILS ===');
    console.log('Block Number:', tx?.blockNumber);
    console.log('From:', tx?.from);
    console.log('To:', tx?.to);
    console.log('Value:', ethers.formatEther(tx?.value || 0n), 'ETH');
    
    if (receipt && receipt.logs) {
      console.log('\n=== LOGS/EVENTS ===');
      console.log('Number of logs:', receipt.logs.length);
      
      for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i];
        console.log(`\nLog ${i}:`);
        console.log('  Contract:', log.address);
        
        // Check if it's a Transfer event
        if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
          console.log('  Type: ERC-20 Transfer');
          console.log('  From:', '0x' + log.topics[1].substring(26));
          console.log('  To:', '0x' + log.topics[2].substring(26));
          const amount = ethers.toBigInt(log.data);
          console.log('  Amount (USDT):', ethers.formatUnits(amount, 6));
        }
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkTx();
