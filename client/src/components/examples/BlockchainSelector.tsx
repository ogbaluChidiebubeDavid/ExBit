import { BlockchainSelector } from '../BlockchainSelector';
import { useState } from 'react';

export default function BlockchainSelectorExample() {
  const [selected, setSelected] = useState('ethereum');
  
  return (
    <BlockchainSelector 
      selected={selected} 
      onSelect={(chain) => {
        setSelected(chain);
        console.log('Selected blockchain:', chain);
      }} 
    />
  );
}
