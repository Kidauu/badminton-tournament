import { describe, expect, it } from "vitest";
import { createBackup, parseBackup } from "./backup";
import { createInitialState } from "../state/tournamentReducer";

describe("tournament backup", () => {
  it("round-trips a valid tournament state", () => {
    const state = createInitialState();
    state.participants = [{ id: "p1", name: "Andi" }];
    expect(parseBackup(createBackup(state))).toEqual(state);
  });

  it("rejects malformed and unrelated JSON", () => {
    expect(parseBackup("not json")).toBeNull();
    expect(parseBackup(JSON.stringify({ format: "something-else", version: 1, data: {} }))).toBeNull();
  });
});
