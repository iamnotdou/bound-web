/**
 * The shared reporter for the `scripts/check-*.ts` and `scripts/e2e.ts` runs.
 *
 * Every one of those scripts asserts against something outside this repo — a
 * live testnet, a running dev server — so the thing that matters is not that a
 * process exited but that each individual claim was checked and printed with
 * the value it was checked against. A summary line that says "all good" while
 * hiding what was compared is how a green run stops meaning anything.
 */
const GREEN = "[32m";
const RED = "[31m";
const DIM = "[2m";
const YELLOW = "[33m";
const RESET = "[0m";

let passed = 0;
let failed = 0;

export function pass(label: string, detail?: string): void {
  passed += 1;
  process.stdout.write(
    `  ${GREEN}✓${RESET} ${label}${detail ? ` ${DIM}${detail}${RESET}` : ""}\n`,
  );
}

export function fail(label: string, detail: string): void {
  failed += 1;
  process.stdout.write(`  ${RED}✗${RESET} ${label} ${RED}${detail}${RESET}\n`);
}

/** Something worth reading that is not an assertion. */
export function note(text: string): void {
  process.stdout.write(`  ${YELLOW}·${RESET} ${text}\n`);
}

export function section(title: string): void {
  process.stdout.write(`\n${title}\n`);
}

export function check(label: string, condition: boolean, detail: string): void {
  if (condition) pass(label, detail);
  else fail(label, detail);
}

export function equals(
  label: string,
  actual: unknown,
  expected: unknown,
): void {
  const a = String(actual);
  const e = String(expected);
  if (a === e) pass(label, `= ${a}`);
  else fail(label, `expected ${e}, got ${a}`);
}

/** Print the tally and exit non-zero if anything failed. Never returns. */
export function finish(): never {
  const total = passed + failed;
  process.stdout.write(
    failed === 0
      ? `\n${GREEN}${passed}/${total} checks passed${RESET}\n`
      : `\n${RED}${failed} of ${total} checks failed${RESET}\n`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

/** Report an unexpected throw as a failure rather than a stack trace. */
export function crashed(label: string, error: unknown): void {
  fail(label, error instanceof Error ? error.message : String(error));
}
