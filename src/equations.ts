/**
 * Shielded Sync Load Equations
 *
 * Derives max bandwidth load and max trial decrypt load
 * under worst-case (spam) conditions for each shielding pool.
 *
 * All sizes in bytes unless noted otherwise.
 */

import type { PresetConfig } from "./types";

// ─────────────────────────────────────────────────────────
// SHARED CONSTANTS
// ─────────────────────────────────────────────────────────

/** Default max block size minus coinbase reserved bytes */
const DEFAULT_EFFECTIVE_BLOCK_SIZE = 2_000_000 - 1739;

/** Coinbase reserved bytes (subtracted from any block size) */
const COINBASE_RESERVED = 1739;

function effectiveBlockSize(config: PresetConfig): number {
  if (config.useCustomBlockSize) {
    return config.customOrchardBlockSizeMB * 1_000_000 - COINBASE_RESERVED;
  }
  return DEFAULT_EFFECTIVE_BLOCK_SIZE;
}

/** Compact block header size (bytes) */
const COMPACT_BLOCK_HEADER_SIZE = 90;

// ─────────────────────────────────────────────────────────
// SAPLING CONSTANTS
// ─────────────────────────────────────────────────────────

/** Sapling spend description size (bytes) */
const SAPLING_SPEND_SIZE = 352;

/** Sapling output description size (bytes) */
const SAPLING_OUTPUT_SIZE = 948;

/** Sapling per-transaction flat overhead (bytes) */
const SAPLING_FLAT_UNKNOWN = 109;

// ─────────────────────────────────────────────────────────
// ORCHARD CONSTANTS
// ─────────────────────────────────────────────────────────

/** Orchard spend auth signature size (bytes) */
const ORCHARD_SPEND_AUTH_SIG = 64;

/** Orchard per-action proof size (bytes) */
const ORCHARD_PER_ACTION_PROOF_SIZE = 2272;

/** Orchard action description size (bytes) */
const ORCHARD_ACTION_DESC = 820;

/** Per-action total = spend_auth_sig + proof + action_desc */
const ORCHARD_PER_ACTION_SIZE =
  ORCHARD_SPEND_AUTH_SIG +
  ORCHARD_PER_ACTION_PROOF_SIZE +
  ORCHARD_ACTION_DESC;

/** Orchard binding signature (bytes) */
const ORCHARD_BINDING_SIG = 64;

/** Orchard flat proof size (bytes) */
const ORCHARD_FLAT_PROOF = 2720;

/** Orchard per-transaction flat overhead */
const ORCHARD_FLAT_SIZE = ORCHARD_BINDING_SIG + ORCHARD_FLAT_PROOF;

/** Max actions in a sandblast (spam) transaction */
const ORCHARD_ACTIONS_PER_SANDBLAST_TX = 32;

/** Compact block bandwidth per orchard action (bytes) */
const ORCHARD_BANDWIDTH_PER_ACTION = 148;

// ─────────────────────────────────────────────────────────
// ZIP-231 MEMO BUNDLE ADJUSTMENTS
// ─────────────────────────────────────────────────────────

/** ZIP-231: bandwidth per action increases by 48 bytes */
const ZIP231_BANDWIDTH_PER_ACTION_DELTA = 48;

/** ZIP-231: flat tx overhead increases by 512 bytes */
const ZIP231_FLAT_DELTA = 512;

/** ZIP-231: per-action size decreases by (512 - 48) bytes */
const ZIP231_PER_ACTION_DELTA = -(512 - 48);

// ─────────────────────────────────────────────────────────
// ZSA ADJUSTMENTS
// ─────────────────────────────────────────────────────────

/** ZSA: adds 32-byte AssetBase per action to tx size */
const ZSA_PER_ACTION_DELTA = 32;

/** ZSA: adds 32 bytes bandwidth per action for shielded sync */
const ZSA_BANDWIDTH_PER_ACTION_DELTA = 32;

// ─────────────────────────────────────────────────────────
// SHARED COMPUTATIONS
// ─────────────────────────────────────────────────────────

export interface SharedResult {
  effectiveBlockSize: number;
  blockTime: number;
  numBlocksPerDay: number;
  compactBlockHeaderBwPerDay: number;
  trialDecryptMultiplier: number;
  /** Orchard tx size with 2 actions (normal tx) */
  orchardNormalTxSize: number;
  /** Max Orchard TPS (2-action txs) */
  orchardTps: number;
}

/**
 * Shared values derived from config — block timing, compact block
 * header bandwidth, and trial decrypt multiplier.
 * Applied after max(sapling, orchard) in the final rollup.
 */
export function computeShared(config: PresetConfig): SharedResult {
  // ── Effective block size ─────────────────────────────
  const ebs = effectiveBlockSize(config);

  // ── Block timing ─────────────────────────────────────
  const blockTime = config.useCustomBlockInterval ? config.customBlockIntervalS : 75; // seconds
  const numBlocksPerDay = Math.floor((24 * 60 * 60) / blockTime);

  // ── Compact block header bandwidth ───────────────────
  const compactBlockHeaderBwPerDay = COMPACT_BLOCK_HEADER_SIZE * numBlocksPerDay;

  // ── Trial decrypt multiplier ─────────────────────────
  // Base: 2 (full viewing key = incoming + outgoing)
  // /2 if IVK sync removed (only outgoing)
  // *2 if Keystone enabled (extra key exchange)
  let trialDecryptMultiplier = 2;
  if (config.removeIVKSync) {
    trialDecryptMultiplier /= 2;
  }
  if (config.includeKeystone) {
    trialDecryptMultiplier *= 2;
  }

  // ── Orchard TPS (2-action normal tx) ────────────────
  const zip231 = config.zip231MemoBundles;
  const zsa = config.includeZSA;
  const orchardNormalTxSize =
    2 * (ORCHARD_PER_ACTION_SIZE + (zip231 ? ZIP231_PER_ACTION_DELTA : 0) + (zsa ? ZSA_PER_ACTION_DELTA : 0)) +
    (ORCHARD_FLAT_SIZE + (zip231 ? ZIP231_FLAT_DELTA : 0));
  const orchardTxsPerBlock = Math.floor(ebs / orchardNormalTxSize);
  const orchardTps = orchardTxsPerBlock / blockTime;

  return {
    effectiveBlockSize: ebs,
    blockTime,
    numBlocksPerDay,
    compactBlockHeaderBwPerDay,
    trialDecryptMultiplier,
    orchardNormalTxSize,
    orchardTps,
  };
}

// ─────────────────────────────────────────────────────────
// SAPLING DERIVED
// ─────────────────────────────────────────────────────────

export interface SaplingResult {
  saplingEffectiveBlockSize: number;
  saplingSpamTxSize: number;
  saplingTxsPerBlock: number;
  numOutputsPerBlock: number;
  /** Per-block bandwidth from sapling outputs only (no header) */
  bandwidthLoadPerBlock: number;
  /** Raw bandwidth per day from sapling outputs only (no header) */
  rawBandwidthPerDay: number;
  /** Raw outputs per day before trial decrypt multiplier */
  rawDecryptsPerDay: number;
}

export function computeSapling(config: PresetConfig, shared: SharedResult): SaplingResult {
  // ── Effective block size ──────────────────────────────
  // Sapling always uses default 2MB block size (custom block size is orchard-only)
  const saplingEffectiveBlockSize = config.lowerSaplingBandwidth
    ? 333_000
    : DEFAULT_EFFECTIVE_BLOCK_SIZE;

  // ── Spam transaction sizing ──────────────────────────
  // Worst-case tx: 1 spend + 32 outputs + flat overhead
  const saplingSpamTxSize =
    SAPLING_SPEND_SIZE +
    32 * SAPLING_OUTPUT_SIZE +
    SAPLING_FLAT_UNKNOWN;

  const saplingTxsPerBlock =
    saplingEffectiveBlockSize / saplingSpamTxSize;

  const numOutputsPerBlock = Math.ceil(saplingTxsPerBlock * 32);

  // ── Bandwidth per block ──────────────────────────────
  // Each tx contributes 32 bytes + 112 bytes per output
  const bandwidthLoadPerBlock =
    32 * saplingTxsPerBlock +
    112 * numOutputsPerBlock;

  // ── Daily totals (raw, no header) ────────────────────
  const rawBandwidthPerDay = bandwidthLoadPerBlock * shared.numBlocksPerDay;
  const rawDecryptsPerDay = numOutputsPerBlock * shared.numBlocksPerDay;

  return {
    saplingEffectiveBlockSize,
    saplingSpamTxSize,
    saplingTxsPerBlock,
    numOutputsPerBlock,
    bandwidthLoadPerBlock,
    rawBandwidthPerDay,
    rawDecryptsPerDay,
  };
}

// ─────────────────────────────────────────────────────────
// ORCHARD DERIVED
// ─────────────────────────────────────────────────────────

export interface OrchardResult {
  orchardPerActionSize: number;
  orchardFlatSize: number;
  orchardBandwidthPerAction: number;
  orchardActionsPerBlock: number;
  /** Per-block bandwidth from orchard actions only (no header) */
  bandwidthLoadPerBlock: number;
  /** Raw bandwidth per day from orchard actions only (no header) */
  rawBandwidthPerDay: number;
  /** Raw actions per day before trial decrypt multiplier */
  rawDecryptsPerDay: number;
}

export function computeOrchard(config: PresetConfig, shared: SharedResult): OrchardResult {
  // ── ZIP-231 & ZSA adjustments ──────────────────────
  const zip231 = config.zip231MemoBundles;
  const zsa = config.includeZSA;
  const orchardPerActionSize = ORCHARD_PER_ACTION_SIZE +
    (zip231 ? ZIP231_PER_ACTION_DELTA : 0) +
    (zsa ? ZSA_PER_ACTION_DELTA : 0);
  const orchardFlatSize = ORCHARD_FLAT_SIZE +
    (zip231 ? ZIP231_FLAT_DELTA : 0);
  const orchardBandwidthPerAction = ORCHARD_BANDWIDTH_PER_ACTION +
    (zip231 ? ZIP231_BANDWIDTH_PER_ACTION_DELTA : 0) +
    (zsa ? ZSA_BANDWIDTH_PER_ACTION_DELTA : 0);

  // ── Actions per block ───────────────────────────────
  // When orchard blockspace is limited, derive from 2-action normal tx size.
  // Otherwise, derive from 32-action sandblast spam txs (worst case).
  const orchardActionsPerBlock = config.useCustomBlockSize
    ? Math.floor(shared.effectiveBlockSize / shared.orchardNormalTxSize) * 2
    : Math.ceil((shared.effectiveBlockSize / (ORCHARD_ACTIONS_PER_SANDBLAST_TX * orchardPerActionSize + orchardFlatSize)) * ORCHARD_ACTIONS_PER_SANDBLAST_TX);

  // ── Bandwidth per block ──────────────────────────────
  const bandwidthLoadPerBlock =
    orchardBandwidthPerAction * orchardActionsPerBlock;

  // ── Daily totals (raw, no header) ────────────────────
  const rawBandwidthPerDay = bandwidthLoadPerBlock * shared.numBlocksPerDay;
  const rawDecryptsPerDay = orchardActionsPerBlock * shared.numBlocksPerDay;

  return {
    orchardPerActionSize,
    orchardFlatSize,
    orchardBandwidthPerAction,
    orchardActionsPerBlock,
    bandwidthLoadPerBlock,
    rawBandwidthPerDay,
    rawDecryptsPerDay,
  };
}
