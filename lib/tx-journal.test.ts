import { beforeEach, describe, expect, it } from "vitest";
import {
  createJournal,
  type JournalStorage,
  type TxJournal,
} from "@/lib/tx-journal";

/** A `localStorage` that lives in a variable. */
function fakeStorage(initial: Record<string, string> = {}): JournalStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const NOW = 1_800_000_000;

describe("the transaction journal", () => {
  let storage: ReturnType<typeof fakeStorage>;
  let journal: TxJournal;

  beforeEach(() => {
    storage = fakeStorage();
    journal = createJournal(storage, () => NOW);
  });

  it("round-trips put → pending → settle", () => {
    journal.put({
      hash: HASH_A,
      action: "deposit",
      certId: 7,
      address: "GDOUNKJLAMAPLK7IZ2MGBE3S4RHF4SSQYPDRCGK2VNSP6IHFR5OQ7HGF",
      submittedAtUnix: NOW,
    });

    expect(journal.pending().map((e) => e.hash)).toEqual([HASH_A]);
    expect(journal.pending()[0].status).toBe("pending");
    expect(journal.pending()[0].certId).toBe(7);

    journal.settle(HASH_A, "success");

    expect(journal.pending()).toEqual([]);
    expect(journal.entries()).toHaveLength(1);
    expect(journal.entries()[0].status).toBe("success");
  });

  it("survives a reload — the entry is in storage, not in memory", () => {
    journal.put({
      hash: HASH_A,
      action: "attest",
      certId: 3,
      address: "GCNDTXR7FDINZ7THO2QMAE7QXBTM2P5JW7XDNN3V6BJM3UFK67GLSMEF",
      submittedAtUnix: NOW,
    });

    // A fresh journal over the same storage is what a page reload looks like.
    const reloaded = createJournal(storage, () => NOW);
    expect(reloaded.pending().map((e) => e.hash)).toEqual([HASH_A]);
  });

  it("records a failure without losing the entry", () => {
    journal.put({
      hash: HASH_A,
      action: "stake",
      certId: null,
      address: "GDOW5KBNLB23YWPTZBVD7BKZVWHPSRYOMOU6G4AXKDPCXMK7OA2QGWEM",
      submittedAtUnix: NOW,
    });
    journal.settle(HASH_A, "failed");

    expect(journal.pending()).toEqual([]);
    expect(journal.entries()[0].status).toBe("failed");
  });

  it("forgets an entry outright", () => {
    journal.put({
      hash: HASH_A,
      action: "publish",
      certId: null,
      address: "GDOW5KBNLB23YWPTZBVD7BKZVWHPSRYOMOU6G4AXKDPCXMK7OA2QGWEM",
      submittedAtUnix: NOW,
    });
    journal.forget(HASH_A);
    expect(journal.entries()).toEqual([]);
  });

  it("keeps several transactions apart", () => {
    journal.put({
      hash: HASH_A,
      action: "deposit",
      certId: 1,
      address: "GA",
      submittedAtUnix: NOW - 10,
    });
    journal.put({
      hash: HASH_B,
      action: "attest",
      certId: 2,
      address: "GA",
      submittedAtUnix: NOW,
    });
    journal.settle(HASH_A, "success");

    expect(journal.pending().map((e) => e.hash)).toEqual([HASH_B]);
    expect(journal.entries().map((e) => e.hash)).toEqual([HASH_B, HASH_A]);
  });

  it("does not duplicate a hash that is put twice", () => {
    const entry = {
      hash: HASH_A,
      action: "deposit" as const,
      certId: 1,
      address: "GA",
      submittedAtUnix: NOW,
    };
    journal.put(entry);
    journal.put(entry);
    expect(journal.entries()).toHaveLength(1);
  });

  it("settling a hash it has never seen changes nothing", () => {
    journal.settle(HASH_B, "success");
    expect(journal.entries()).toEqual([]);
  });

  it("drops entries older than a day rather than nagging about them", () => {
    journal.put({
      hash: HASH_A,
      action: "deposit",
      certId: 1,
      address: "GA",
      submittedAtUnix: NOW - 25 * 60 * 60,
    });
    journal.put({
      hash: HASH_B,
      action: "deposit",
      certId: 2,
      address: "GA",
      submittedAtUnix: NOW,
    });
    expect(journal.entries().map((e) => e.hash)).toEqual([HASH_B]);
  });

  it("treats corrupt storage as an empty journal, not as a crash", () => {
    const corrupt = fakeStorage({ "bound:tx-journal": "{not json" });
    const recovered = createJournal(corrupt, () => NOW);
    expect(recovered.entries()).toEqual([]);
    recovered.put({
      hash: HASH_A,
      action: "deposit",
      certId: 1,
      address: "GA",
      submittedAtUnix: NOW,
    });
    expect(recovered.pending()).toHaveLength(1);
  });

  it("ignores entries that are not entries", () => {
    const junk = fakeStorage({
      "bound:tx-journal": JSON.stringify([
        { hash: 42 },
        null,
        "nope",
        {
          hash: HASH_A,
          action: "deposit",
          certId: null,
          address: "GA",
          submittedAtUnix: NOW,
          status: "pending",
        },
      ]),
    });
    const filtered = createJournal(junk, () => NOW);
    expect(filtered.entries().map((e) => e.hash)).toEqual([HASH_A]);
  });

  it("keeps working when storage refuses to write", () => {
    const blocked: JournalStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const journalWithoutStorage = createJournal(blocked, () => NOW);
    expect(() =>
      journalWithoutStorage.put({
        hash: HASH_A,
        action: "deposit",
        certId: 1,
        address: "GA",
        submittedAtUnix: NOW,
      }),
    ).not.toThrow();
    // Nothing was stored, so nothing is remembered — but the page still runs.
    expect(journalWithoutStorage.entries()).toEqual([]);
  });
});
