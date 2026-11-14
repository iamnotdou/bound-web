/**
 * Every outbound link and developer snippet the NEAR site shows, in one
 * place, so the header, footer, landing page and docs cannot disagree.
 * Pure data; safe on both sides of the server/client line.
 */
export const NEAR_GITHUB_URL =
  "https://github.com/iamnotdou/bound/tree/near-hackathon";
export const NEAR_NPM_URL = "https://www.npmjs.com/package/@bound/near";
export const NEAR_RUN_ID = "mwfnc6q8";
export const NEAR_RUN_PATH = `/app/near/run/${NEAR_RUN_ID}`;

/** Developer surface, as the landing page and deck print it. */
export const NEAR_SNIPPETS = {
  install: "npm install @bound/near",
  verify: "npx @bound/near verify bound-agent2-mwfnc6q8.testnet",
  mcp: `{
  "mcpServers": {
    "bound-near": {
      "command": "npx",
      "args": ["-y", "@bound/near", "mcp"]
    }
  }
}`,
  http: "GET /api/near/verify/<agent>",
} as const;
