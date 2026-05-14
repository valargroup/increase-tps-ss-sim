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
  /** Include ZSA (adds 32-byte AssetBase per action) */
  includeZSA: boolean;
  /** Whether to cap orchard actions per block */
  useOrchardActionLimit: boolean;
  /** Max orchard actions per block (only used when useOrchardActionLimit is true) */
  customOrchardActionLimit: number;
}

export const ORCHARD_ACTION_LIMIT_OPTIONS = [450, 400, 350, 333, 325, 306, 250, 200, 150] as const;
/** Today's max orchard actions per block (2-action txs in default 2 MB block) */
export const ORCHARD_ACTIONS_TODAY = 438;
/** Today's block interval in seconds */
export const BLOCK_INTERVAL_TODAY = 75;
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
  includeZSA: false,
  useOrchardActionLimit: false,
  customOrchardActionLimit: 450,
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
  useOrchardActionLimit: true,
  customOrchardActionLimit: 306,
};
