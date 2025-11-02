import axios from "axios";

interface CoinGeckoPrice {
  [key: string]: {
    ngn: number;
  };
}

const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";

// Map our token symbols to CoinGecko IDs
const COINGECKO_ID_MAP: Record<string, string> = {
  USDT: "tether",
  USDC: "usd-coin",
  DAI: "dai",
  ETH: "ethereum",
  BNB: "binancecoin",
  MATIC: "matic-network",
  BUSD: "binance-usd",
};

export class PriceService {
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  async getTokenPriceInNaira(symbol: string): Promise<number> {
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    try {
      const coinGeckoId = COINGECKO_ID_MAP[symbol];
      if (!coinGeckoId) {
        throw new Error(`Unsupported token: ${symbol}`);
      }

      const response = await axios.get<CoinGeckoPrice>(
        `${COINGECKO_API_URL}/simple/price`,
        {
          params: {
            ids: coinGeckoId,
            vs_currencies: "ngn",
          },
          timeout: 5000,
        }
      );

      const nairaPrice = response.data[coinGeckoId]?.ngn;
      if (!nairaPrice) {
        throw new Error(`No price data available for ${symbol}`);
      }

      this.priceCache.set(symbol, {
        price: nairaPrice,
        timestamp: Date.now(),
      });

      return nairaPrice;
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      
      // Fallback prices if API fails
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
    try {
      // Fetch all prices in one API call for efficiency
      const allCoinGeckoIds = Object.values(COINGECKO_ID_MAP).join(",");
      
      const response = await axios.get<CoinGeckoPrice>(
        `${COINGECKO_API_URL}/simple/price`,
        {
          params: {
            ids: allCoinGeckoIds,
            vs_currencies: "ngn",
          },
          timeout: 5000,
        }
      );

      const prices: Record<string, number> = {};

      // Map CoinGecko IDs back to our token symbols
      for (const [symbol, coinGeckoId] of Object.entries(COINGECKO_ID_MAP)) {
        const nairaPrice = response.data[coinGeckoId]?.ngn;
        if (nairaPrice) {
          prices[symbol] = nairaPrice;
          this.priceCache.set(symbol, {
            price: nairaPrice,
            timestamp: Date.now(),
          });
        }
      }

      return prices;
    } catch (error) {
      console.error("Failed to fetch all prices:", error);
      
      // Use cached prices if available, otherwise fallback
      const prices: Record<string, number> = {};
      const tokens = Object.keys(COINGECKO_ID_MAP);

      for (const token of tokens) {
        const cached = this.priceCache.get(token);
        if (cached) {
          prices[token] = cached.price;
        } else {
          // Use fallback prices
          prices[token] = await this.getTokenPriceInNaira(token);
        }
      }

      return prices;
    }
  }
}

export const priceService = new PriceService();
