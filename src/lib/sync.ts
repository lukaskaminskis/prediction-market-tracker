// Data Sync Service
// Orchestrates data ingestion, matching, and opportunity detection

import { prisma } from "./db";
import {
  fetchMarketsFromVenue,
  SUPPORTED_VENUES,
  VENUE_INFO,
  type VenueId,
  type MarketData,
} from "./markets-api";
import { getMockMarketsForVenue } from "./apibricks";
import {
  findAllMatches,
  groupMatches,
  generateCanonicalTitle,
  type MarketWithOutcomes,
} from "./matching";
import { detectOpportunities } from "./opportunities";

// Initialize venues in the database
async function initializeVenues(): Promise<void> {
  for (const venueId of SUPPORTED_VENUES) {
    const info = VENUE_INFO[venueId];
    await prisma.venue.upsert({
      where: { id: venueId },
      update: { name: info.name, url: info.url },
      create: { id: venueId, name: info.name, url: info.url },
    });
  }
}

// Fetch markets from direct APIs or use mock data
async function fetchMarketsFromSource(venue: VenueId): Promise<MarketData[]> {
  const isDemoMode = process.env.DEMO_MODE === "true";

  if (isDemoMode) {
    console.log(`Using mock data for ${venue}`);
    const mockData = getMockMarketsForVenue(venue);
    return mockData.map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      category: m.category,
      status: m.status,
      url: m.url,
      volume: m.volume,
      liquidity: m.liquidity,
      endDate: m.end_date,
      outcomes: m.outcomes,
    }));
  }

  try {
    console.log(`Fetching real data from ${venue}...`);
    const markets = await fetchMarketsFromVenue(venue);
    console.log(`Got ${markets.length} markets from ${venue}`);
    return markets;
  } catch (error) {
    console.error(`Error fetching from ${venue}:`, error);
    // Fall back to mock data on error
    console.log(`Falling back to mock data for ${venue}`);
    const mockData = getMockMarketsForVenue(venue);
    return mockData.map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      category: m.category,
      status: m.status,
      url: m.url,
      volume: m.volume,
      liquidity: m.liquidity,
      endDate: m.end_date,
      outcomes: m.outcomes,
    }));
  }
}

// Upsert market data from API response
async function upsertMarket(
  apiMarket: MarketData,
  venueId: VenueId
): Promise<string> {
  const market = await prisma.market.upsert({
    where: {
      venueId_externalId: {
        venueId,
        externalId: apiMarket.id,
      },
    },
    update: {
      title: apiMarket.title,
      description: apiMarket.description,
      category: apiMarket.category,
      status: apiMarket.status,
      url: apiMarket.url,
      volume: apiMarket.volume,
      liquidity: apiMarket.liquidity,
      endDate: apiMarket.endDate ? new Date(apiMarket.endDate) : null,
    },
    create: {
      externalId: apiMarket.id,
      venueId,
      title: apiMarket.title,
      description: apiMarket.description,
      category: apiMarket.category,
      status: apiMarket.status,
      url: apiMarket.url,
      volume: apiMarket.volume,
      liquidity: apiMarket.liquidity,
      endDate: apiMarket.endDate ? new Date(apiMarket.endDate) : null,
    },
  });

  // Upsert outcomes
  for (const outcome of apiMarket.outcomes) {
    await prisma.outcome.upsert({
      where: {
        marketId_name: {
          marketId: market.id,
          name: outcome.name,
        },
      },
      update: {
        price: outcome.price,
        volume: outcome.volume,
        lastUpdated: new Date(),
      },
      create: {
        externalId: outcome.id,
        marketId: market.id,
        name: outcome.name,
        price: outcome.price,
        volume: outcome.volume,
      },
    });
  }

  return market.id;
}

// Sync all markets from all venues
async function syncMarkets(): Promise<number> {
  let totalMarkets = 0;

  for (const venue of SUPPORTED_VENUES) {
    console.log(`Syncing markets from ${venue}...`);
    const markets = await fetchMarketsFromSource(venue);

    for (const market of markets) {
      if (market.title && market.outcomes.length > 0) {
        await upsertMarket(market, venue);
        totalMarkets++;
      }
    }

    console.log(`Synced ${markets.length} markets from ${venue}`);
  }

  return totalMarkets;
}

// Run the matching algorithm and create/update groups
async function runMatching(): Promise<void> {
  console.log("Running market matching...");

  // Get all active markets with outcomes
  const markets = await prisma.market.findMany({
    where: { status: "active", groupId: null },
    include: { outcomes: true, venue: true },
  });

  console.log(`Found ${markets.length} ungrouped active markets`);

  if (markets.length < 2) return;

  // Find matches
  const matches = findAllMatches(markets as MarketWithOutcomes[]);
  console.log(`Found ${matches.length} potential matches`);

  // Group matches
  const groups = groupMatches(markets as MarketWithOutcomes[], matches);
  console.log(`Created ${groups.size} market groups`);

  // Create/update groups in database
  for (const [, marketGroup] of groups) {
    const canonicalTitle = generateCanonicalTitle(marketGroup);
    const categories = marketGroup
      .map(m => m.category)
      .filter(Boolean);
    const category = categories.length > 0 ? categories[0] : null;

    // Create or find existing group with similar title
    let group = await prisma.marketGroup.findFirst({
      where: {
        canonicalTitle: {
          contains: canonicalTitle.substring(0, 50),
        },
      },
    });

    if (!group) {
      group = await prisma.marketGroup.create({
        data: {
          canonicalTitle,
          category,
        },
      });
    }

    // Link markets to group
    for (const market of marketGroup) {
      await prisma.market.update({
        where: { id: market.id },
        data: { groupId: group.id },
      });
    }
  }
}

// Detect opportunities for all groups
async function detectAllOpportunities(): Promise<number> {
  console.log("Detecting opportunities...");

  // Get all groups with their markets
  const groups = await prisma.marketGroup.findMany({
    include: {
      markets: {
        include: {
          outcomes: true,
          venue: true,
        },
      },
    },
  });

  let opportunityCount = 0;

  // Deactivate old opportunities
  await prisma.opportunity.updateMany({
    data: { isActive: false },
  });

  for (const group of groups) {
    if (group.markets.length < 2) continue;

    const opportunities = detectOpportunities(group as any);

    for (const opp of opportunities) {
      await prisma.opportunity.create({
        data: {
          groupId: opp.groupId,
          type: opp.type,
          score: opp.score,
          spread: opp.spread,
          description: opp.description,
          details: JSON.stringify(opp.details),
          avgLiquidity: opp.avgLiquidity,
          isActive: true,
        },
      });
      opportunityCount++;
    }
  }

  console.log(`Detected ${opportunityCount} opportunities`);
  return opportunityCount;
}

// Main sync function
export async function runSync(): Promise<{
  marketsProcessed: number;
  opportunitiesFound: number;
  error?: string;
}> {
  // Create sync log
  const syncLog = await prisma.syncLog.create({
    data: { status: "running" },
  });

  try {
    // Initialize venues
    await initializeVenues();

    // Sync markets
    const marketsProcessed = await syncMarkets();

    // Run matching
    await runMatching();

    // Detect opportunities
    const opportunitiesFound = await detectAllOpportunities();

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        endedAt: new Date(),
        marketsProcessed,
        opportunitiesFound,
      },
    });

    return { marketsProcessed, opportunitiesFound };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Update sync log with error
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "failed",
        endedAt: new Date(),
        error: errorMessage,
      },
    });

    console.error("Sync failed:", error);
    return { marketsProcessed: 0, opportunitiesFound: 0, error: errorMessage };
  }
}

// Get sync status
export async function getSyncStatus() {
  const lastSync = await prisma.syncLog.findFirst({
    orderBy: { startedAt: "desc" },
  });

  const marketCount = await prisma.market.count();
  const groupCount = await prisma.marketGroup.count();
  const activeOpportunities = await prisma.opportunity.count({
    where: { isActive: true },
  });

  return {
    lastSync,
    stats: {
      markets: marketCount,
      groups: groupCount,
      activeOpportunities,
    },
  };
}
