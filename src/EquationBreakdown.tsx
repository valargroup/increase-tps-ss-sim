import { useState } from "react";
import type { SharedResult, SaplingResult, OrchardResult } from "./equations";

interface Variable {
  name: string;
  value: number | string;
  unit?: string;
  bold?: boolean;
}

function Var({ name, value, unit, bold }: Variable) {
  const [hovered, setHovered] = useState(false);
  const display = typeof value === "number" ? value.toLocaleString() : value;

  return (
    <span
      className={`eq-var ${hovered ? "eq-var-hovered" : ""}`}
      style={bold ? { fontWeight: 700, color: "#fff" } : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {name}
      {hovered && (
        <span className="eq-tooltip">
          {display}{unit ? ` ${unit}` : ""}
        </span>
      )}
    </span>
  );
}

/** Wrap content in bold if `bold` is true */
function B({ bold, children }: { bold: boolean; children: React.ReactNode }) {
  return bold ? <strong style={{ color: "#fff" }}>{children}</strong> : <>{children}</>;
}

interface SideData {
  label: string;
  color: string;
  shared: SharedResult;
  sapling: SaplingResult;
  orchard: OrchardResult;
}

interface EquationBreakdownProps {
  a: SideData;
  b: SideData;
}

export function EquationBreakdown({ a, b }: EquationBreakdownProps) {
  const [open, setOpen] = useState(false);

  function renderSide(side: SideData, ref: SideData, isB: boolean) {
    const { shared, sapling, orchard, color, label } = side;
    const r = ref; // reference side for diff comparison

    const maxRawBw = Math.max(sapling.rawBandwidthPerDay, orchard.rawBandwidthPerDay);
    const finalBw = maxRawBw + shared.compactBlockHeaderBwPerDay;
    const maxRawDecrypts = Math.max(sapling.rawDecryptsPerDay, orchard.rawDecryptsPerDay);
    const finalDecrypts = maxRawDecrypts * shared.trialDecryptMultiplier;

    const rMaxRawBw = Math.max(r.sapling.rawBandwidthPerDay, r.orchard.rawBandwidthPerDay);
    const rFinalBw = rMaxRawBw + r.shared.compactBlockHeaderBwPerDay;
    const rMaxRawDecrypts = Math.max(r.sapling.rawDecryptsPerDay, r.orchard.rawDecryptsPerDay);
    const rFinalDecrypts = rMaxRawDecrypts * r.shared.trialDecryptMultiplier;

    // diff helper: bold on B side when value differs from A
    const d = (val: number | string, refVal: number | string) => isB && val !== refVal;

    return (
      <div className="eq-side" style={{ borderColor: color }}>
        <h3 className="eq-side-label" style={{ color }}>{label}</h3>

        {/* ── SHARED ─────────────────────────────────── */}
        <h4>Shared Constants</h4>
        <div className="eq-line">
          <Var name="COINBASE_RESERVED" value={1739} unit="bytes" />
        </div>
        <div className="eq-line">
          <Var name="COMPACT_BLOCK_HEADER_SIZE" value={90} unit="bytes" />
        </div>

        <h4>Shared Derived</h4>
        <div className="eq-line">
          <Var name="effective_block_size" value={shared.effectiveBlockSize} unit="bytes" bold={d(shared.effectiveBlockSize, r.shared.effectiveBlockSize)} />{" "}
          <B bold={d(shared.effectiveBlockSize, r.shared.effectiveBlockSize)}>
            = {shared.effectiveBlockSize === 2_000_000 - 1739
              ? "2,000,000 − 1,739 (default 2 MB)"
              : `${((shared.effectiveBlockSize + 1739) / 1_000_000).toFixed(2)} MB − 1,739 (custom)`}
          </B>
        </div>
        <div className="eq-line">
          <Var name="block_time" value={shared.blockTime} unit="s" bold={d(shared.blockTime, r.shared.blockTime)} />{" "}
          <B bold={d(shared.blockTime, r.shared.blockTime)}>
            = {shared.blockTime === 75 ? "75s (default)" : `${shared.blockTime}s (custom)`}
          </B>
        </div>
        <div className="eq-line">
          <Var name="num_blocks_per_day" value={shared.numBlocksPerDay} bold={d(shared.numBlocksPerDay, r.shared.numBlocksPerDay)} />{" "}
          = floor(86400 / block_time)
        </div>
        <div className="eq-line">
          <Var name="compact_block_header_bw_per_day" value={shared.compactBlockHeaderBwPerDay} unit="bytes" bold={d(shared.compactBlockHeaderBwPerDay, r.shared.compactBlockHeaderBwPerDay)} />{" "}
          = COMPACT_BLOCK_HEADER_SIZE × num_blocks_per_day
        </div>
        <div className="eq-line">
          <Var name="trial_decrypt_multiplier" value={shared.trialDecryptMultiplier} bold={d(shared.trialDecryptMultiplier, r.shared.trialDecryptMultiplier)} />{" "}
          <B bold={d(shared.trialDecryptMultiplier, r.shared.trialDecryptMultiplier)}>
            = 2{shared.trialDecryptMultiplier !== 2 && " (adjusted by toggles)"}
          </B>
        </div>
        <div className="eq-line eq-note">
          Both applied after max(sapling, orchard) in final rollup
        </div>

        <h4>Orchard TPS (2-action tx)</h4>
        <div className="eq-line">
          <Var name="orchard_normal_tx_size" value={shared.orchardNormalTxSize} unit="bytes" bold={d(shared.orchardNormalTxSize, r.shared.orchardNormalTxSize)} />{" "}
          <B bold={d(shared.orchardNormalTxSize, r.shared.orchardNormalTxSize)}>
            = 2 × ORCHARD_PER_ACTION_SIZE + ORCHARD_FLAT_SIZE{shared.orchardNormalTxSize !== 2 * 3156 + 2784 && " (adjusted)"}
          </B>
        </div>
        <div className="eq-line">
          <Var name="orchard_tps" value={Math.round(shared.orchardTps * 100) / 100} unit="tx/s" bold={d(Math.round(shared.orchardTps * 100), Math.round(r.shared.orchardTps * 100))} />{" "}
          = floor(effective_block_size / orchard_normal_tx_size) / block_time
        </div>

        {/* ── SAPLING ────────────────────────────────── */}
        <h4 className="eq-section-sapling">Sapling Constants</h4>
        <div className="eq-line">
          <Var name="SAPLING_SPEND_SIZE" value={352} unit="bytes" />,{" "}
          <Var name="SAPLING_OUTPUT_SIZE" value={948} unit="bytes" />,{" "}
          <Var name="SAPLING_FLAT_UNKNOWN" value={109} unit="bytes" />
        </div>

        <h4 className="eq-section-sapling">Sapling Derived</h4>
        <div className="eq-line">
          <Var name="sapling_effective_block_size" value={sapling.saplingEffectiveBlockSize} unit="bytes" bold={d(sapling.saplingEffectiveBlockSize, r.sapling.saplingEffectiveBlockSize)} />{" "}
          <B bold={d(sapling.saplingEffectiveBlockSize, r.sapling.saplingEffectiveBlockSize)}>
            = {sapling.saplingEffectiveBlockSize === 333_000 ? "333,000 (checkbox)" : "effective_block_size"}
          </B>
        </div>
        <div className="eq-line">
          <Var name="sapling_spam_tx_size" value={sapling.saplingSpamTxSize} unit="bytes" bold={d(sapling.saplingSpamTxSize, r.sapling.saplingSpamTxSize)} />{" "}
          = SAPLING_SPEND_SIZE + 32 × SAPLING_OUTPUT_SIZE + SAPLING_FLAT_UNKNOWN
        </div>
        <div className="eq-line">
          <Var name="sapling_txs_per_block" value={sapling.saplingTxsPerBlock} bold={d(sapling.saplingTxsPerBlock, r.sapling.saplingTxsPerBlock)} />{" "}
          = sapling_effective_block_size / sapling_spam_tx_size
        </div>
        <div className="eq-line">
          <Var name="sapling_outputs_per_block" value={sapling.numOutputsPerBlock} bold={d(sapling.numOutputsPerBlock, r.sapling.numOutputsPerBlock)} />{" "}
          = ceil(sapling_txs_per_block × 32)
        </div>
        <div className="eq-line">
          <Var name="sapling_bw_per_block" value={sapling.bandwidthLoadPerBlock} unit="bytes" bold={d(sapling.bandwidthLoadPerBlock, r.sapling.bandwidthLoadPerBlock)} />{" "}
          = 32 × sapling_txs_per_block + 112 × sapling_outputs_per_block
        </div>

        <h4 className="eq-section-sapling">Sapling Daily (raw)</h4>
        <div className="eq-line">
          <Var name="sapling_raw_bw_per_day" value={sapling.rawBandwidthPerDay} unit="bytes" bold={d(sapling.rawBandwidthPerDay, r.sapling.rawBandwidthPerDay)} />{" "}
          = sapling_bw_per_block × num_blocks_per_day
          <span className="eq-converted">
            ({(sapling.rawBandwidthPerDay / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} MB)
          </span>
        </div>
        <div className="eq-line">
          <Var name="sapling_raw_decrypts_per_day" value={sapling.rawDecryptsPerDay} bold={d(sapling.rawDecryptsPerDay, r.sapling.rawDecryptsPerDay)} />{" "}
          = sapling_outputs_per_block × num_blocks_per_day
        </div>

        {/* ── ORCHARD ────────────────────────────────── */}
        <h4 className="eq-section-orchard">Orchard Constants</h4>
        <div className="eq-line">
          <Var name="ORCHARD_SPEND_AUTH_SIG" value={64} unit="bytes" />,{" "}
          <Var name="ORCHARD_PER_ACTION_PROOF_SIZE" value={2272} unit="bytes" />,{" "}
          <Var name="ORCHARD_ACTION_DESC" value={820} unit="bytes" />
        </div>
        <div className="eq-line">
          <Var name="ORCHARD_PER_ACTION_SIZE" value={orchard.orchardPerActionSize} unit="bytes" bold={d(orchard.orchardPerActionSize, r.orchard.orchardPerActionSize)} />{" "}
          <B bold={d(orchard.orchardPerActionSize, r.orchard.orchardPerActionSize)}>
            = SPEND_AUTH_SIG + PER_ACTION_PROOF_SIZE + ACTION_DESC{orchard.orchardPerActionSize !== 3156 && " (adjusted)"}
          </B>
        </div>
        <div className="eq-line">
          <Var name="ORCHARD_BINDING_SIG" value={64} unit="bytes" />,{" "}
          <Var name="ORCHARD_FLAT_PROOF" value={2720} unit="bytes" />
        </div>
        <div className="eq-line">
          <Var name="ORCHARD_FLAT_SIZE" value={orchard.orchardFlatSize} unit="bytes" bold={d(orchard.orchardFlatSize, r.orchard.orchardFlatSize)} />{" "}
          <B bold={d(orchard.orchardFlatSize, r.orchard.orchardFlatSize)}>
            = BINDING_SIG + FLAT_PROOF{orchard.orchardFlatSize !== 2784 && " + 512 (ZIP-231)"}
          </B>
        </div>
        <div className="eq-line">
          <Var name="ORCHARD_BANDWIDTH_PER_ACTION" value={orchard.orchardBandwidthPerAction} unit="bytes" bold={d(orchard.orchardBandwidthPerAction, r.orchard.orchardBandwidthPerAction)} />{" "}
          <B bold={d(orchard.orchardBandwidthPerAction, r.orchard.orchardBandwidthPerAction)}>
            = {orchard.orchardBandwidthPerAction !== 148 ? `148 (adjusted)` : "148"}
          </B>
        </div>

        <h4 className="eq-section-orchard">Orchard Derived</h4>
        <div className="eq-line">
          <Var name="orchard_actions_per_block" value={orchard.orchardActionsPerBlock} bold={d(orchard.orchardActionsPerBlock, r.orchard.orchardActionsPerBlock)} />{" "}
          <B bold={d(orchard.orchardActionsPerBlock, r.orchard.orchardActionsPerBlock)}>
            = {d(orchard.orchardActionsPerBlock, r.orchard.orchardActionsPerBlock)
              ? "floor(effective_block_size / normal_tx_size) × 2 (action limit)"
              : "ceil(effective_block_size / spam_tx_size × 32)"}
          </B>
        </div>
        <div className="eq-line">
          <Var name="orchard_bw_per_block" value={orchard.bandwidthLoadPerBlock} unit="bytes" bold={d(orchard.bandwidthLoadPerBlock, r.orchard.bandwidthLoadPerBlock)} />{" "}
          = ORCHARD_BANDWIDTH_PER_ACTION × orchard_actions_per_block
        </div>

        <h4 className="eq-section-orchard">Orchard Daily (raw)</h4>
        <div className="eq-line">
          <Var name="orchard_raw_bw_per_day" value={orchard.rawBandwidthPerDay} unit="bytes" bold={d(orchard.rawBandwidthPerDay, r.orchard.rawBandwidthPerDay)} />{" "}
          = orchard_bw_per_block × num_blocks_per_day
          <span className="eq-converted">
            ({(orchard.rawBandwidthPerDay / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} MB)
          </span>
        </div>
        <div className="eq-line">
          <Var name="orchard_raw_decrypts_per_day" value={orchard.rawDecryptsPerDay} bold={d(orchard.rawDecryptsPerDay, r.orchard.rawDecryptsPerDay)} />{" "}
          = orchard_actions_per_block × num_blocks_per_day
        </div>

        {/* ── FINAL ROLLUP ───────────────────────────── */}
        <h4>Final Rollup</h4>
        <div className="eq-line">
          <Var name="max_raw_bw_per_day" value={maxRawBw} unit="bytes" bold={d(maxRawBw, rMaxRawBw)} />{" "}
          = max(sapling_raw_bw_per_day, orchard_raw_bw_per_day)
        </div>
        <div className="eq-line">
          <Var name="final_bw_per_day" value={finalBw} unit="bytes" bold={d(finalBw, rFinalBw)} />{" "}
          = max_raw_bw_per_day + compact_block_header_bw_per_day
          <span className="eq-converted">
            <B bold={d(finalBw, rFinalBw)}>
              ({(finalBw / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} MB)
            </B>
          </span>
        </div>
        <div className="eq-line">
          <Var name="max_raw_decrypts_per_day" value={maxRawDecrypts} bold={d(maxRawDecrypts, rMaxRawDecrypts)} />{" "}
          = max(sapling_raw_decrypts_per_day, orchard_raw_decrypts_per_day)
        </div>
        <div className="eq-line">
          <Var name="final_trial_decrypts_per_day" value={finalDecrypts} bold={d(finalDecrypts, rFinalDecrypts)} />{" "}
          = max_raw_decrypts_per_day × trial_decrypt_multiplier
        </div>
      </div>
    );
  }

  return (
    <div className="eq-breakdown-wrapper">
      <button className="eq-toggle" onClick={() => setOpen(!open)}>
        Equation Breakdown {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="eq-comparison">
          {renderSide(a, b, false)}
          {renderSide(b, a, true)}
        </div>
      )}
    </div>
  );
}
