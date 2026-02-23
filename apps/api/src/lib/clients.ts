import { TBAClient } from '@allianceops/shared';
import { StatboticsClient } from '@allianceops/shared';

let tbaClient: TBAClient | null = null;
let statboticsClient: StatboticsClient | null = null;

export function getTBAClient(): TBAClient {
  if (!tbaClient) {
    const apiKey = process.env.TBA_API_KEY;
    if (!apiKey) {
      throw new Error('TBA_API_KEY environment variable is required');
    }
    tbaClient = new TBAClient(apiKey);
  }
  return tbaClient;
}

export function getStatboticsClient(): StatboticsClient {
  if (!statboticsClient) {
    const baseUrl = process.env.STATBOTICS_BASE_URL || undefined;
    statboticsClient = new StatboticsClient(baseUrl);
  }
  return statboticsClient;
}
