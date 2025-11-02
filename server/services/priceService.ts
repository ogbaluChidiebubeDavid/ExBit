import axios from "axios";

interface BinancePrice {
  symbol: string;
  price: string;
}

const BINANCE_API_URL = "https://api.binance.com/api/v3";

const BINANCE_SYMBOL_MAP: Record<string, string> = {
  USDT: "USDTBUSD",
  USDC: "USDCBUSD",
  DAI: "DAIBUSD",
  ETH: "ETHUSDT",
  BNB: "BNBUSDT",
  MATIC: "MATICUSDT",
  BUSD: "BUSDUSDT",
};

const NAIRA_USD_RATE = 1650;

export class PriceService {
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000;

  async getTokenPriceInNaira(symbol: string): Promise<number> {
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    try {
      const binanceSymbol = BINANCE_SYMBOL_MAP[symbol];
      if (!binanceSymbol) {
        throw new Error(`Unsupported token: ${symbol}`);
      }

      const response = await axios.get<BinancePrice>(`${BINANCE_API_URL}/ticker/price`, {
        params: { symbol: binanceSymbol },
      });

      let usdPrice: number;
      
      if (symbol === "USDT" || symbol === "USDC" || symbol === "DAI" || symbol === "BUSD") {
        usdPrice = 1;
      } else {
        usdPrice = parseFloat(response.data.price);
      }

      const nairaPrice = usdPrice * NAIRA_USD_RATE;

      this.priceCache.set(symbol, {
        price: nairaPrice,
        timestamp: Date.now(),
      });

      return nairaPrice;
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      
      const fallbackPrices: Record<string, number> = {
        USDT: 1650,
        USDC: 1650,
        DAI: 1650,
        BUSD: 1650,
        ETH: 1650 * 3500,
        BNB: 1650 * 600,
        MATIC: 1650 * 0.9,
      };

      return fallbackPrices[symbol] || 1650;
    }
  }

  async getAllPrices(): Promise<Record<string, number>> {
    const tokens = Object.keys(BINANCE_SYMBOL_MAP);
    const prices: Record<string, number> = {};

    await Promise.all(
      tokens.map(async (token) => {
        try {
          prices[token] = await this.getTokenPriceInNaira(token);
        } catch (error) {
          console.error(`Failed to get price for ${token}:`, error);
        }
      })
    );

    return prices;
  }
}

export const priceService = new PriceService();
