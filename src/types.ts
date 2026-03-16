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
  /** Whether to limit sapling inputs+outputs per block */
  useSaplingIoLimit: boolean;
  /** Max sapling inputs+outputs per block */
  saplingIoLimit: number;
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
/** Max sapling inputs+outputs per block at 2MB: floor(1998261 / 61033) * 65 */
export const SAPLING_IO_MAX_TODAY = 2080;
export const SAPLING_IO_OPTIONS = [2080, 1000, 390, 300, 250, 200] as const;

export const PRESET_TODAY: PresetConfig = {
  label: "Today",
  excludeSaplingAttack: false,
  removeIVKSync: false,
  includeKeystone: false,
  useCustomBlockInterval: false,
  customBlockIntervalS: 25,
  useSaplingIoLimit: false,
  saplingIoLimit: 2080,
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
  useSaplingIoLimit: true,
  saplingIoLimit: 300,
  includeZSA: false,
  useCustomBlockSize: true,
  customOrchardBlockSizeMB: 1.4,
};
