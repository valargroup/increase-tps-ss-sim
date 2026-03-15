import type { PresetConfig } from "./types";

/**
 * Placeholder computation functions.
 * These will be replaced with real equations once the UI layout is reviewed.
 */

export function computeBandwidthMBPerDay(config: PresetConfig): number {
  // TODO: Replace with real equations
  let base = 500; // MB/day baseline

  if (config.excludeSaplingAttack) {
    base *= 0.6;
  }

  if (config.removeIVKSync) {
    base *= 0.7;
  }

  if (config.includeKeystone) {
    base *= 0.8;
  }

  if (config.reduceBlockInterval) {
    base *= 0.9;
  }

  if (config.lowerSaplingBandwidth) {
    base *= 0.2;
  }

  return Math.round(base * 100) / 100;
}

export function computeTrialDecryptsPerDay(config: PresetConfig): number {
  // TODO: Replace with real equations
  let base = 1_000_000; // trial decrypts/day baseline

  if (config.excludeSaplingAttack) {
    base *= 0.5;
  }

  if (config.removeIVKSync) {
    base *= 0.5; // 2x reduction
  }

  if (config.includeKeystone) {
    base *= 0.7;
  }

  if (config.reduceBlockInterval) {
    base *= 0.9;
  }

  if (config.lowerSaplingBandwidth) {
    base *= 0.2;
  }

  return Math.round(base);
}
