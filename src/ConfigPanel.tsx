import type { PresetConfig } from "./types";
import { BLOCK_SIZE_OPTIONS, BLOCK_INTERVAL_OPTIONS, SAPLING_IO_OPTIONS, SAPLING_IO_MAX_TODAY } from "./types";

interface ConfigPanelProps {
  label: string;
  color: string;
  config: PresetConfig;
  onChange: (config: PresetConfig) => void;
}

function RelativeChange({ ratio }: { ratio: number }) {
  const pct = Math.round(Math.abs(1 - ratio) * 100);
  const direction = ratio <= 1 ? "decrease" : "increase";
  return (
    <span className="pct-note">
      ({pct}% relative {direction} to today)
    </span>
  );
}

export function ConfigPanel({ label, color, config, onChange }: ConfigPanelProps) {
  const blockTimeSpeedup = config.useCustomBlockInterval ? 75 / config.customBlockIntervalS : 1;

  const toggle = (key: "removeIVKSync" | "zip231MemoBundles" | "includeZSA") => {
    onChange({ ...config, [key]: !config[key] });
  };

  return (
    <div className="config-panel" style={{ borderColor: color }}>
      <h3 style={{ color }}>{label}</h3>

      <div className="toggles">
        <label>
          <input
            type="checkbox"
            checked={config.removeIVKSync}
            onChange={() => toggle("removeIVKSync")}
          />
          Remove incoming view key shielded sync
        </label>

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
        </div>

        <div className="block-size-control">
          <label>
            <input
              type="checkbox"
              checked={config.useSaplingIoLimit}
              onChange={() => onChange({ ...config, useSaplingIoLimit: !config.useSaplingIoLimit })}
            />
            Sapling max inputs+outputs / block
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
          {config.useSaplingIoLimit && (
            <RelativeChange ratio={config.saplingIoLimit / SAPLING_IO_MAX_TODAY * blockTimeSpeedup} />
          )}
        </div>

        <label>
          <input
            type="checkbox"
            checked={config.zip231MemoBundles}
            onChange={() => toggle("zip231MemoBundles")}
          />
          ZIP-231 memo bundles
        </label>

        <label className="has-tooltip">
          <input
            type="checkbox"
            checked={config.includeZSA}
            onChange={() => toggle("includeZSA")}
          />
          Include ZSA
          <span className="config-tooltip">Adds a 32-byte AssetBase to the note plaintext (and therefore shielded sync)</span>
        </label>

        <div className="block-size-control">
          <label className="has-tooltip">
            <input
              type="checkbox"
              checked={config.useCustomBlockSize}
              onChange={() => onChange({ ...config, useCustomBlockSize: !config.useCustomBlockSize })}
            />
            Limit Orchard blockspace
            <span className="config-tooltip">
              Computes an action limit from the number of<br />
              2-action txs that could be packed in this block size.<br /><br />
              Enforced in protocol via a limit on the number<br />
              of actions per block.<br /><br />
              This lowers the spread between sandblast and<br />
              regular tx usage.
            </span>
          </label>
          <select
            className="block-size-select"
            value={config.customOrchardBlockSizeMB}
            disabled={!config.useCustomBlockSize}
            onChange={(e) => onChange({ ...config, customOrchardBlockSizeMB: Number(e.target.value) })}
          >
            {BLOCK_SIZE_OPTIONS.map((mb) => (
              <option key={mb} value={mb}>{mb} MB</option>
            ))}
          </select>
          {config.useCustomBlockSize && (
            <RelativeChange ratio={(config.customOrchardBlockSizeMB * 1000) / 2000 * blockTimeSpeedup} />
          )}
        </div>
      </div>
    </div>
  );
}
