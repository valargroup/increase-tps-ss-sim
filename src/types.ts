export interface Config {
  label: string;
  color: string;
  // Toggles
  excludeSaplingAttack: boolean;
  removeIVKSync: boolean;
  includeKeystone: boolean;
  // Equation inputs — placeholder values, will be replaced with real equations
  bandwidthMBPerDay: number;
  trialDecryptsPerDay: number;
}

export interface PresetConfig {
  label: string;
  excludeSaplingAttack: boolean;
  removeIVKSync: boolean;
  includeKeystone: boolean;
  /** Whether to use a custom block interval instead of the default 75s */
  useCustomBlockInterval: boolean;
  /** Custom block interval in seconds */
  customBlockIntervalS: number;
  lowerSaplingBandwidth: boolean;
  /** ZIP-231 memo bundle */
  zip231MemoBundles: boolean;
  /** Include ZSA (adds 32-byte AssetBase per action) */
  includeZSA: boolean;
  /** Whether to limit orchard blockspace */
  useCustomBlockSize: boolean;
  /** Custom block size in MB (only used when useCustomBlockSize is true) */
  customOrchardBlockSizeMB: number;
}

export const BLOCK_SIZE_OPTIONS = [2, 1.9, 1.75, 1.5, 1.4, 1.33, 1] as const;
export const BLOCK_INTERVAL_OPTIONS = [20, 25, 27.5, 30, 35, 37.5] as const;

export const PRESET_TODAY: PresetConfig = {
  label: "Today",
  excludeSaplingAttack: false,
  removeIVKSync: false,
  includeKeystone: false,
  useCustomBlockInterval: false,
  customBlockIntervalS: 25,
  lowerSaplingBandwidth: false,
  zip231MemoBundles: false,
  includeZSA: false,
  useCustomBlockSize: false,
  customOrchardBlockSizeMB: 2,
};

export const PRESET_PROPOSED: PresetConfig = {
  label: "Proposed",
  excludeSaplingAttack: false,
  removeIVKSync: false,
  includeKeystone: false,
  useCustomBlockInterval: true,
  customBlockIntervalS: 25,
  lowerSaplingBandwidth: true,
  includeZSA: false,
  useCustomBlockSize: true,
  customOrchardBlockSizeMB: 1.33,
};
