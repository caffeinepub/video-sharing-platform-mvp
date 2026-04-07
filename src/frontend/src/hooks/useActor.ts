/**
 * Project-specific useActor wrapper.
 * Wraps the platform @caffeineai/core-infrastructure useActor with the
 * generated backend createActor function so every query/mutation hook
 * gets a fully-typed Backend actor without having to pass the factory
 * manually each time.
 */
import { useActor as usePlatformActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";
import type { Backend } from "../backend";

export function useActor(): { actor: Backend | null; isFetching: boolean } {
  return usePlatformActor(createActor);
}
