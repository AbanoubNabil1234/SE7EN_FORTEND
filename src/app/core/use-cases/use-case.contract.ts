/**
 * Base Use Case Contract.
 * Represents an isolated business operation following the Single Responsibility Principle (SRP).
 */
export interface UseCase<TInput, TOutput> {
  execute(input?: TInput): TOutput;
}
