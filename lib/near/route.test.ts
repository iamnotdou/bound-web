import { describe, expect, it } from "vitest";
import { isNearRoute } from "./route";

describe("isNearRoute", () => {
  it("matches the NEAR pages only", () => {
    expect(isNearRoute("/app/near")).toBe(true);
    expect(isNearRoute("/app/near/cert/1")).toBe(true);
    expect(isNearRoute("/app/near/run/abc")).toBe(true);
    expect(isNearRoute("/app")).toBe(false);
    expect(isNearRoute("/app/nearby")).toBe(false);
    expect(isNearRoute("/app/cert/3")).toBe(false);
    expect(isNearRoute(null)).toBe(false);
  });
});
