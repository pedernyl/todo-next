import { describe, it } from "vitest";
import { assertIntegrationTestDbEnvIsActive } from "./assertIntegrationTestDbEnv";

describe("integration env setup", () => {
  it("maps test database env variables to runtime Supabase env variables", () => {
    assertIntegrationTestDbEnvIsActive();
  });
});
