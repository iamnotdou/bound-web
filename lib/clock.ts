/**
 * The wall clock, in whole seconds.
 *
 * `deriveCertState` takes `now` as a parameter so it can be proved without one,
 * which leaves every caller needing to read a clock. Reading it through a
 * function rather than inline is not ceremony: `Date.now()` in a component body
 * is an impure call during render, and React's lint rule is right to refuse it
 * even in a Server Component that renders exactly once. This is the seam where
 * the impurity is named and confined.
 */
export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}
