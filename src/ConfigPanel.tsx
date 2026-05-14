import type { PresetConfig } from "./types";
import {
  ORCHARD_ACTION_LIMIT_OPTIONS,
  ORCHARD_ACTIONS_TODAY,
  BLOCK_INTERVAL_OPTIONS,
  BLOCK_INTERVAL_TODAY,
  SAPLING_IO_OPTIONS,
  SAPLING_IO_MAX_TODAY,
} from "./types";
import { computeShared } from "./equations";

interface ConfigPanelProps {
  label: string;
  color: string;
  config: PresetConfig;
  onChange: (config: PresetConfig) => void;
}

function RelativeChange({ ratio }: { ratio: number }) {
  const pct = Math.round(Math.abs(1 - ratio) * 100);
  const direction = ratio <= 1 ? "decrease" : "increase";
  return <>({pct}% relative {direction} to today)</>;
}

export function ConfigPanel({ label, color, config, onChange }: ConfigPanelProps) {
  const blockTimeSpeedup = config.useCustomBlockInterval ? 75 / config.customBlockIntervalS : 1;

  // Implied min orchard blockspace at the chosen action limit
  // (orchard normal tx size depends on ZSA toggle)
  const impliedOrchardMB = config.useOrchardActionLimit
    ? ((config.customOrchardActionLimit / 2) * computeShared(config).orchardNormalTxSize + 1739) / 1_000_000
    : 0;

  // Actions/sec ratio vs today (438 actions / 75 s)
  const blockTime = config.useCustomBlockInterval ? config.customBlockIntervalS : 75;
  const orchardActionRatio = config.useOrchardActionLimit
    ? (config.customOrchardActionLimit / blockTime) / (ORCHARD_ACTIONS_TODAY / BLOCK_INTERVAL_TODAY)
    : 1;

  return (
    <div className="config-panel" style={{ borderColor: color }}>
      <h3 style={{ color }}>{label}</h3>

      <div className="toggles">
        <div className="block-size-control">
          <label>
            <input
              type="checkbox"
              checked={config.useCustomBlockInterval}
              onChange={() => onChange({ ...config, useCustomBlockInterval: !config.useCustomBlockInterval })}
            />
            Reduce block interval
          </label>
          <select
            className="block-size-select"
            value={config.customBlockIntervalS}
            disabled={!config.useCustomBlockInterval}
            onChange={(e) => onChange({ ...config, customBlockIntervalS: Number(e.target.value) })}
          >
            {BLOCK_INTERVAL_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}s</option>
            ))}
          </select>
          <span className="pct-note">{" "}</span>
        </div>

        <div className="block-size-control">
          <label>
            <input
              type="checkbox"
              checked={config.useSaplingIoLimit}
              onChange={() => onChange({ ...config, useSaplingIoLimit: !config.useSaplingIoLimit })}
            />
            Sapling input+output limit
          </label>
          <select
            className="block-size-select"
            value={config.saplingIoLimit}
            disabled={!config.useSaplingIoLimit}
            onChange={(e) => onChange({ ...config, saplingIoLimit: Number(e.target.value) })}
          >
            {SAPLING_IO_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}{v === SAPLING_IO_MAX_TODAY ? " (max today)" : ""}</option>
            ))}
          </select>
          <span className="pct-note">
            {config.useSaplingIoLimit
              ? <RelativeChange ratio={config.saplingIoLimit / SAPLING_IO_MAX_TODAY * blockTimeSpeedup} />
              : " "}
          </span>
        </div>

        <div className="block-size-control">
          <label className="has-tooltip">
            <input
              type="checkbox"
              checked={config.useOrchardActionLimit}
              onChange={() => onChange({ ...config, useOrchardActionLimit: !config.useOrchardActionLimit })}
            />
            Orchard action limit
            <span className="config-tooltip">
              Caps the number of Orchard actions per block directly.<br /><br />
              Equivalent to limiting Orchard blockspace to the minimum<br />
              size that fits N/2 2-action txs.<br /><br />
              This lowers the spread between sandblast and<br />
              regular tx usage.
            </span>
          </label>
          <select
            className="block-size-select"
            value={config.customOrchardActionLimit}
            disabled={!config.useOrchardActionLimit}
            onChange={(e) => onChange({ ...config, customOrchardActionLimit: Number(e.target.value) })}
          >
            {ORCHARD_ACTION_LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} actions</option>
            ))}
          </select>
          <span className="pct-note">
            {config.useOrchardActionLimit ? (() => {
              const pct = Math.round(Math.abs(1 - orchardActionRatio) * 100);
              const dir = orchardActionRatio <= 1 ? "decrease" : "increase";
              return `(${pct}% relative ${dir} in actions/s; ≈ ${impliedOrchardMB.toFixed(2)} MB max orchard blockspace)`;
            })() : " "}
          </span>
        </div>
      </div>
    </div>
  );
}
