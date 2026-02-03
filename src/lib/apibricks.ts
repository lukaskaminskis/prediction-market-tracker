// Apibricks.io API Client for Prediction Markets

const APIBRICKS_BASE_URL = "https://api.apibricks.io/v1";

export interface ApibricksMarket {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status: string;
  url?: string;
  volume?: number;
  liquidity?: number;
  start_date?: string;
  end_date?: string;
  resolution?: string;
  outcomes: ApibricksOutcome[];
}

export interface ApibricksOutcome {
  id?: string;
  name: string;
  price: number;
  volume?: number;
}

export interface ApibricksResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export type VenueId = "polymarket" | "kalshi" | "manifold";

const VENUE_INFO: Record<VenueId, { name: string; url: string }> = {
  polymarket: { name: "Polymarket", url: "https://polymarket.com" },
  kalshi: { name: "Kalshi", url: "https://kalshi.com" },
  manifold: { name: "Manifold", url: "https://manifold.markets" },
};

export const SUPPORTED_VENUES = Object.keys(VENUE_INFO) as VenueId[];

class ApibricksClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(`${APIBRICKS_BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Apibricks API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async getMarkets(
    venue: VenueId,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      category?: string;
    } = {}
  ): Promise<ApibricksResponse<ApibricksMarket[]>> {
    const params: Record<string, string> = {
      venue,
      limit: String(options.limit || 100),
      offset: String(options.offset || 0),
    };

    if (options.status) params.status = options.status;
    if (options.category) params.category = options.category;

    return this.request<ApibricksResponse<ApibricksMarket[]>>(
      "/prediction-markets",
      params
    );
  }

  async getMarket(venue: VenueId, marketId: string): Promise<ApibricksMarket> {
    return this.request<ApibricksMarket>(
      `/prediction-markets/${venue}/${marketId}`
    );
  }

  async getAllMarketsForVenue(
    venue: VenueId,
    maxPages: number = 10
  ): Promise<ApibricksMarket[]> {
    const allMarkets: ApibricksMarket[] = [];
    let offset = 0;
    const limit = 100;

    for (let page = 0; page < maxPages; page++) {
      const response = await this.getMarkets(venue, {
        limit,
        offset,
        status: "active",
      });

      allMarkets.push(...response.data);

      if (!response.pagination?.hasMore || response.data.length < limit) {
        break;
      }

      offset += limit;
    }

    return allMarkets;
  }
}

let clientInstance: ApibricksClient | null = null;

export function getApibricksClient(): ApibricksClient {
  const apiKey = process.env.APIBRICKS_API_KEY;

  if (!apiKey) {
    throw new Error("APIBRICKS_API_KEY environment variable is not set");
  }

  if (!clientInstance) {
    clientInstance = new ApibricksClient(apiKey);
  }

  return clientInstance;
}

export function getVenueInfo(venueId: VenueId) {
  return VENUE_INFO[venueId];
}

// Demo/mock data for development without API key
// Uses search URLs to ensure links work even for mock data
export function getMockMarkets(): ApibricksMarket[] {
  return [
    {
      id: "poly-1",
      title: "Will Bitcoin exceed $100,000 by end of 2025?",
      description: "Resolves YES if BTC price exceeds $100,000 at any point before December 31, 2025",
      category: "Crypto",
      status: "active",
      url: "https://polymarket.com/markets?_q=Bitcoin%20100000%202025",
      volume: 5200000,
      liquidity: 850000,
      outcomes: [
        { name: "Yes", price: 0.72, volume: 3100000 },
        { name: "No", price: 0.28, volume: 2100000 },
      ],
    },
    {
      id: "kalshi-1",
      title: "Bitcoin to hit $100K in 2025",
      description: "Will Bitcoin reach $100,000 by the end of 2025?",
      category: "Crypto",
      status: "active",
      url: "https://kalshi.com/browse?q=Bitcoin%20100K%202025",
      volume: 1800000,
      liquidity: 320000,
      outcomes: [
        { name: "Yes", price: 0.68, volume: 1100000 },
        { name: "No", price: 0.32, volume: 700000 },
      ],
    },
    {
      id: "manifold-1",
      title: "Will BTC reach $100,000 before 2026?",
      category: "Crypto",
      status: "active",
      url: "https://manifold.markets/browse?q=Bitcoin%20100000%202026",
      volume: 45000,
      liquidity: 12000,
      outcomes: [
        { name: "Yes", price: 0.65, volume: 28000 },
        { name: "No", price: 0.35, volume: 17000 },
      ],
    },
    {
      id: "poly-2",
      title: "Will the Fed cut rates in Q1 2026?",
      description: "Resolves YES if Federal Reserve announces rate cut in Jan-Mar 2026",
      category: "Economics",
      status: "active",
      url: "https://polymarket.com/markets?_q=Fed%20cut%20rates%20Q1%202026",
      volume: 3400000,
      liquidity: 620000,
      outcomes: [
        { name: "Yes", price: 0.45, volume: 1800000 },
        { name: "No", price: 0.55, volume: 1600000 },
      ],
    },
    {
      id: "kalshi-2",
      title: "Federal Reserve rate cut Q1 2026",
      category: "Economics",
      status: "active",
      url: "https://kalshi.com/browse?q=Federal%20Reserve%20rate%20cut%20Q1%202026",
      volume: 2100000,
      liquidity: 410000,
      outcomes: [
        { name: "Yes", price: 0.52, volume: 1200000 },
        { name: "No", price: 0.48, volume: 900000 },
      ],
    },
    {
      id: "poly-3",
      title: "Will AI pass the Turing test by 2027?",
      category: "Technology",
      status: "active",
      url: "https://polymarket.com/markets?_q=AI%20Turing%20test%202027",
      volume: 890000,
      liquidity: 180000,
      outcomes: [
        { name: "Yes", price: 0.38, volume: 520000 },
        { name: "No", price: 0.62, volume: 370000 },
      ],
    },
    {
      id: "manifold-3",
      title: "AI passes Turing test before 2027",
      category: "AI",
      status: "active",
      url: "https://manifold.markets/browse?q=AI%20Turing%20test%202027",
      volume: 32000,
      liquidity: 8500,
      outcomes: [
        { name: "Yes", price: 0.31, volume: 18000 },
        { name: "No", price: 0.69, volume: 14000 },
      ],
    },
    {
      id: "poly-4",
      title: "Will SpaceX Starship reach orbit in 2026?",
      category: "Space",
      status: "active",
      url: "https://polymarket.com/markets?_q=SpaceX%20Starship%20orbit%202026",
      volume: 1250000,
      liquidity: 290000,
      outcomes: [
        { name: "Yes", price: 0.82, volume: 950000 },
        { name: "No", price: 0.18, volume: 300000 },
      ],
    },
    {
      id: "kalshi-4",
      title: "Starship successful orbital flight 2026",
      category: "Space",
      status: "active",
      url: "https://kalshi.com/browse?q=Starship%20orbital%20flight%202026",
      volume: 680000,
      liquidity: 145000,
      outcomes: [
        { name: "Yes", price: 0.78, volume: 480000 },
        { name: "No", price: 0.22, volume: 200000 },
      ],
    },
    {
      id: "poly-5",
      title: "2026 US Midterm Elections: Republicans win House?",
      category: "Politics",
      status: "active",
      url: "https://polymarket.com/markets?_q=2026%20Midterm%20Republicans%20House",
      volume: 8900000,
      liquidity: 1200000,
      outcomes: [
        { name: "Yes", price: 0.58, volume: 5200000 },
        { name: "No", price: 0.42, volume: 3700000 },
      ],
    },
    {
      id: "kalshi-5",
      title: "GOP wins House in 2026 midterms",
      category: "Politics",
      status: "active",
      url: "https://kalshi.com/browse?q=GOP%20House%202026%20midterms",
      volume: 4200000,
      liquidity: 780000,
      outcomes: [
        { name: "Yes", price: 0.54, volume: 2400000 },
        { name: "No", price: 0.46, volume: 1800000 },
      ],
    },
    {
      id: "manifold-5",
      title: "Republicans control House after 2026 elections",
      category: "Politics",
      status: "active",
      url: "https://manifold.markets/browse?q=Republicans%20House%202026",
      volume: 78000,
      liquidity: 21000,
      outcomes: [
        { name: "Yes", price: 0.61, volume: 48000 },
        { name: "No", price: 0.39, volume: 30000 },
      ],
    },
    // Market with internal inconsistency (outcomes don't sum to ~1)
    {
      id: "poly-6",
      title: "Which company reaches $5T market cap first?",
      category: "Finance",
      status: "active",
      url: "https://polymarket.com/markets?_q=company%205T%20market%20cap",
      volume: 2100000,
      liquidity: 450000,
      outcomes: [
        { name: "Apple", price: 0.35, volume: 700000 },
        { name: "Microsoft", price: 0.28, volume: 550000 },
        { name: "Nvidia", price: 0.42, volume: 850000 }, // Sum = 1.05 (inconsistent)
      ],
    },
    {
      id: "kalshi-6",
      title: "First company to $5 trillion valuation",
      category: "Finance",
      status: "active",
      url: "https://kalshi.com/browse?q=company%205%20trillion%20valuation",
      volume: 920000,
      liquidity: 210000,
      outcomes: [
        { name: "Apple", price: 0.38, volume: 350000 },
        { name: "Microsoft", price: 0.31, volume: 280000 },
        { name: "Nvidia", price: 0.29, volume: 290000 }, // Sum = 0.98 (close to 1)
      ],
    },
  ];
}

export function getMockMarketsForVenue(venue: VenueId): ApibricksMarket[] {
  const allMocks = getMockMarkets();
  const venuePrefix = venue === "polymarket" ? "poly" : venue === "kalshi" ? "kalshi" : "manifold";
  return allMocks.filter(m => m.id.startsWith(venuePrefix));
}
