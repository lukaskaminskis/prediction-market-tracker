// DomeAPI client for prediction markets
// https://api.domeapi.io

const DOMEAPI_BASE_URL = "https://api.domeapi.io/v1";

export interface MarketData {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status: string;
  url?: string;
  volume?: number;
  liquidity?: number;
  endDate?: string;
  outcomes: OutcomeData[];
}

export interface OutcomeData {
  id?: string;
  name: string;
  price: number;
  volume?: number;
}

export type VenueId = "polymarket" | "kalshi";

export const SUPPORTED_VENUES: VenueId[] = ["polymarket", "kalshi"];

export const VENUE_INFO: Record<VenueId, { name: string; url: string }> = {
  polymarket: { name: "Polymarket", url: "https://polymarket.com" },
  kalshi: { name: "Kalshi", url: "https://kalshi.com" },
};

function getApiKey(): string {
  const key = process.env.DOMEAPI_KEY;
  if (!key) {
    throw new Error("DOMEAPI_KEY environment variable is not set");
  }
  return key;
}

async function domeApiRequest<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${DOMEAPI_BASE_URL}${endpoint}`, {
    headers: {
      "Authorization": `Bearer ${getApiKey()}`,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`DomeAPI error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============ POLYMARKET ============
interface PolymarketResponse {
  markets: PolymarketMarket[];
  pagination: { total: number; has_more: boolean };
}

interface PolymarketMarket {
  market_slug: string;
  title: string;
  condition_id: string;
  tags?: string[];
  volume_total?: number;
  end_time?: number;
  status: string;
  side_a: { id: string; label: string };
  side_b: { id: string; label: string };
}

async function fetchPolymarketMarkets(): Promise<MarketData[]> {
  try {
    const data = await domeApiRequest<PolymarketResponse>("/polymarket/markets?limit=100");

    return data.markets.map((market) => {
      // Polymarket URL: use condition_id for more reliable linking
      // Format: https://polymarket.com/event/[slug] or fallback to search
      const slug = market.market_slug || market.condition_id;
      const url = slug
        ? `https://polymarket.com/event/${slug}`
        : `https://polymarket.com/markets`;

      return {
        id: market.condition_id || market.market_slug,
        title: market.title,
        description: undefined,
        category: market.tags?.[0] || "General",
        status: market.status === "open" ? "active" : market.status,
        url,
        volume: market.volume_total || 0,
        liquidity: 0,
        endDate: market.end_time ? new Date(market.end_time * 1000).toISOString() : undefined,
        outcomes: [
          { id: market.side_a.id, name: market.side_a.label, price: 0.5 },
          { id: market.side_b.id, name: market.side_b.label, price: 0.5 },
        ],
      };
    });
  } catch (error) {
    console.error("Polymarket fetch error:", error);
    return [];
  }
}

// ============ KALSHI ============
interface KalshiResponse {
  markets: KalshiMarket[];
  pagination?: { total: number; has_more: boolean };
}

interface KalshiMarket {
  event_ticker: string;
  market_ticker: string;
  title: string;
  status: string;
  last_price?: number;
  volume?: number;
  volume_24h?: number;
  close_time?: number;
  end_time?: number;
}

async function fetchKalshiMarkets(): Promise<MarketData[]> {
  try {
    const data = await domeApiRequest<KalshiResponse>("/kalshi/markets?limit=100&status=open");

    return data.markets.map((market) => {
      const yesPrice = (market.last_price || 50) / 100;

      // Kalshi URL: prefer event_ticker, include market_ticker if available
      // Format: https://kalshi.com/markets/[event-ticker] or with specific market
      let url = "https://kalshi.com/markets";
      if (market.event_ticker) {
        // Convert ticker to URL-friendly format (lowercase, replace underscores)
        const eventSlug = market.event_ticker.toLowerCase().replace(/_/g, "-");
        url = `https://kalshi.com/markets/${eventSlug}`;
      }

      return {
        id: market.market_ticker,
        title: market.title,
        description: undefined,
        category: "General",
        status: market.status === "open" ? "active" : market.status,
        url,
        volume: market.volume || market.volume_24h || 0,
        liquidity: 0,
        endDate: market.close_time ? new Date(market.close_time * 1000).toISOString() : undefined,
        outcomes: [
          { name: "Yes", price: yesPrice },
          { name: "No", price: 1 - yesPrice },
        ],
      };
    });
  } catch (error) {
    console.error("Kalshi fetch error:", error);
    return [];
  }
}

// ============ MAIN EXPORTS ============
export async function fetchMarketsFromVenue(venue: VenueId): Promise<MarketData[]> {
  switch (venue) {
    case "polymarket":
      return fetchPolymarketMarkets();
    case "kalshi":
      return fetchKalshiMarkets();
    default:
      return [];
  }
}

export async function fetchAllMarkets(): Promise<Map<VenueId, MarketData[]>> {
  const results = new Map<VenueId, MarketData[]>();

  const [polymarket, kalshi] = await Promise.all([
    fetchPolymarketMarkets(),
    fetchKalshiMarkets(),
  ]);

  results.set("polymarket", polymarket);
  results.set("kalshi", kalshi);

  console.log(`Fetched: Polymarket=${polymarket.length}, Kalshi=${kalshi.length}`);

  return results;
}
