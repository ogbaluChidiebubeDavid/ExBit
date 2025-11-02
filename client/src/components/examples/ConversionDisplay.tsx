import { ConversionDisplay } from '../ConversionDisplay';

export default function ConversionDisplayExample() {
  return (
    <ConversionDisplay
      cryptoAmount="100"
      cryptoSymbol="USDT"
      nairaAmount={165000}
      exchangeRate={1650}
      lastUpdated={new Date()}
    />
  );
}
