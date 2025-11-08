import { ethers } from 'ethers';

const ALCHEMY_KEY = process.env.ALCHEMY_BASE_API_KEY;
const provider = new ethers.JsonRpcProvider(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`);
const USDT_ADDRESS = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2';
const USER_WALLET = '0x0D81018Fd2E3Af827b63bDB121a2276907D3adF1';

const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function decimals() view returns (uint8)',
];

async function testQueryFilter() {
  try {
    const contract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    
    // Test the exact block where the deposit happened
    const depositBlock = 37883953;
    const filter = contract.filters.Transfer(null, USER_WALLET);
    
    console.log('Testing queryFilter for USDT deposits to:', USER_WALLET);
    console.log('Block range:', depositBlock, 'to', depositBlock);
    console.log('Filter:', filter);
    
    const events = await contract.queryFilter(filter, depositBlock, depositBlock);
    
    console.log('\nFound events:', events.length);
    
    for (const event of events) {
      if ('args' in event) {
        const decimals = await contract.decimals();
        const amount = ethers.formatUnits(event.args.value, decimals);
        console.log('\nEvent details:');
        console.log('  TX Hash:', event.transactionHash);
        console.log('  From:', event.args.from);
        console.log('  To:', event.args.to);
        console.log('  Amount:', amount, 'USDT');
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testQueryFilter();
