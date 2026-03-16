import { useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PRESET_TODAY, PRESET_PROPOSED } from "./types";
import type { PresetConfig } from "./types";
import { computeShared, computeSapling, computeOrchard } from "./equations";
import { ConfigPanel } from "./ConfigPanel";
import { EquationBreakdown } from "./EquationBreakdown";
import "./App.css";

const COLOR_A = "#6366f1";
const COLOR_B = "#f59e0b";
const COLOR_SAPLING = "#f472b6";
const COLOR_ORCHARD = "#34d399";

function App() {
  const [configA, setConfigA] = useState<PresetConfig>({ ...PRESET_TODAY });
  const [configB, setConfigB] = useState<PresetConfig>({ ...PRESET_PROPOSED });
  const [includeKeystone, setIncludeKeystone] = useState(false);

  const effectiveA = { ...configA, excludeSaplingAttack: false, includeKeystone };
  const effectiveB = { ...configB, excludeSaplingAttack: false, includeKeystone };

  const sharedA = computeShared(effectiveA);
  const sharedB = computeShared(effectiveB);
  const saplingA = computeSapling(effectiveA, sharedA);
  const saplingB = computeSapling(effectiveB, sharedB);
  const orchardA = computeOrchard(effectiveA, sharedA);
  const orchardB = computeOrchard(effectiveB, sharedB);

  const sapBwA = saplingA.rawBandwidthPerDay;
  const sapBwB = saplingB.rawBandwidthPerDay;
  const sapRawDecA = saplingA.rawDecryptsPerDay;
  const sapRawDecB = saplingB.rawDecryptsPerDay;

  // Final bandwidth = max(sapling, orchard) raw + compact block headers
  const bandwidthA = (Math.max(sapBwA, orchardA.rawBandwidthPerDay) + sharedA.compactBlockHeaderBwPerDay) / 1_000_000;
  const bandwidthB = (Math.max(sapBwB, orchardB.rawBandwidthPerDay) + sharedB.compactBlockHeaderBwPerDay) / 1_000_000;

  // Final decrypts = max(sapling, orchard) raw × shared trial decrypt multiplier
  const rawDecryptsA = Math.max(sapRawDecA, orchardA.rawDecryptsPerDay);
  const rawDecryptsB = Math.max(sapRawDecB, orchardB.rawDecryptsPerDay);
  const decryptsA = rawDecryptsA * sharedA.trialDecryptMultiplier;
  const decryptsB = rawDecryptsB * sharedB.trialDecryptMultiplier;

  // Per-pool bandwidth in MB (including compact block headers)
  const headerMbA = sharedA.compactBlockHeaderBwPerDay / 1_000_000;
  const headerMbB = sharedB.compactBlockHeaderBwPerDay / 1_000_000;
  const bwSapA = Math.round((sapBwA / 1_000_000 + headerMbA) * 100) / 100;
  const bwOrchA = Math.round((orchardA.rawBandwidthPerDay / 1_000_000 + headerMbA) * 100) / 100;
  const bwSapB = Math.round((sapBwB / 1_000_000 + headerMbB) * 100) / 100;
  const bwOrchB = Math.round((orchardB.rawBandwidthPerDay / 1_000_000 + headerMbB) * 100) / 100;

  function overlayRow(name: string, sapling: number, orchard: number) {
    const saplingDominant = sapling >= orchard;
    return {
      name,
      bigger: Math.max(sapling, orchard),
      smaller: Math.min(sapling, orchard),
      biggerPool: saplingDominant ? "Sapling" : "Orchard",
      smallerPool: saplingDominant ? "Orchard" : "Sapling",
      biggerColor: saplingDominant ? COLOR_SAPLING : COLOR_ORCHARD,
      smallerColor: saplingDominant ? COLOR_ORCHARD : COLOR_SAPLING,
      sapling,
      orchard,
    };
  }

  const bandwidthData = [
    overlayRow(configA.label, bwSapA, bwOrchA),
    overlayRow(configB.label, bwSapB, bwOrchB),
  ];

  // Per-pool trial decrypts (with multiplier applied)
  const decSapA = sapRawDecA * sharedA.trialDecryptMultiplier;
  const decOrchA = orchardA.rawDecryptsPerDay * sharedA.trialDecryptMultiplier;
  const decSapB = sapRawDecB * sharedB.trialDecryptMultiplier;
  const decOrchB = orchardB.rawDecryptsPerDay * sharedB.trialDecryptMultiplier;

  const decryptData = [
    overlayRow(configA.label, decSapA, decOrchA),
    overlayRow(configB.label, decSapB, decOrchB),
  ];

  return (
    <div className="app">
      <h1>Zcash Shielded Sync Simulator</h1>
      <p className="subtitle">
        Compare shielded sync performance under different configurations
      </p>

      <div className="global-toggles">
        <label>
          <input
            type="checkbox"
            checked={includeKeystone}
            onChange={() => setIncludeKeystone(!includeKeystone)}
          />
          Include Keystone
        </label>
      </div>

      <div className="config-row">
        <ConfigPanel
          label={configA.label}
          color={COLOR_A}
          config={configA}
          onChange={setConfigA}
        />
        <ConfigPanel
          label={configB.label}
          color={COLOR_B}
          config={configB}
          onChange={setConfigB}
        />
      </div>

      <div className="tps-row">
        <div className="tps-card" style={{ borderColor: COLOR_A }}>
          <span className="tps-label" style={{ color: COLOR_A }}>{configA.label}</span>
          <span className="tps-value">{sharedA.orchardTps.toFixed(2)}</span>
          <span className="tps-unit">Orchard TPS</span>
          <span className="tps-sub">{Math.round(sharedA.orchardTps * sharedA.blockTime * 2)} actions/block, using 2-action txs</span>
          <span className="tps-sub">{orchardA.orchardActionsPerBlock} orchard actions per block (sandblast)</span>
        </div>
        <div className="tps-card" style={{ borderColor: COLOR_B }}>
          <span className="tps-label" style={{ color: COLOR_B }}>{configB.label}</span>
          <span className="tps-value">{sharedB.orchardTps.toFixed(2)}</span>
          <span className="tps-unit">Orchard TPS</span>
          <span className="tps-sub">{orchardB.orchardActionsPerBlock} orchard action limit per block</span>
        </div>
      </div>

      <p className="charts-intro">
        The graphs below show the shielded sync load from each pool type. The worst case sandblast load is the <em>max</em> of the sapling/orchard columns.
      </p>

      <div className="charts-row">
        <div className="chart-container">
          <h2>Max Shielded Sync Client Bandwidth / Day (MB)</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={bandwidthData} barGap={-42}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#aaa" />
              <YAxis stroke="#aaa" unit=" MB" />
              <Tooltip
                contentStyle={{ background: "#1e1e2e", border: "1px solid #444" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background: "#1e1e2e", border: "1px solid #444", padding: "0.5rem 0.75rem", borderRadius: 6 }}>
                      <div style={{ color: "#ccc", marginBottom: 4 }}>{label}</div>
                      <div style={{ color: COLOR_SAPLING }}>Sapling: {d.sapling} MB</div>
                      <div style={{ color: COLOR_ORCHARD }}>Orchard: {d.orchard} MB</div>
                    </div>
                  );
                }}
              />
              <Legend content={() => (
                <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", fontSize: "0.85rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, background: COLOR_SAPLING, borderRadius: 2, display: "inline-block" }} />
                    <span style={{ color: "#ccc" }}>Sapling</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, background: COLOR_ORCHARD, borderRadius: 2, display: "inline-block" }} />
                    <span style={{ color: "#ccc" }}>Orchard</span>
                  </span>
                </div>
              )} />
              <Bar dataKey="bigger" barSize={50} fillOpacity={0.8} isAnimationActive={false}>
                {bandwidthData.map((d, i) => (
                  <Cell key={i} fill={d.biggerColor} />
                ))}
              </Bar>
              <Bar dataKey="smaller" barSize={34} fillOpacity={0.9} isAnimationActive={false}>
                {bandwidthData.map((d, i) => (
                  <Cell key={i} fill={d.smallerColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h2>Max Shielded Sync Trial Decrypt KEs / Day</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={decryptData} barGap={-42}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#aaa" />
              <YAxis stroke="#aaa" tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background: "#1e1e2e", border: "1px solid #444", padding: "0.5rem 0.75rem", borderRadius: 6 }}>
                      <div style={{ color: "#ccc", marginBottom: 4 }}>{label}</div>
                      <div style={{ color: COLOR_SAPLING }}>Sapling: {d.sapling.toLocaleString()}</div>
                      <div style={{ color: COLOR_ORCHARD }}>Orchard: {d.orchard.toLocaleString()}</div>
                    </div>
                  );
                }}
              />
              <Legend content={() => (
                <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", fontSize: "0.85rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, background: COLOR_SAPLING, borderRadius: 2, display: "inline-block" }} />
                    <span style={{ color: "#ccc" }}>Sapling</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, background: COLOR_ORCHARD, borderRadius: 2, display: "inline-block" }} />
                    <span style={{ color: "#ccc" }}>Orchard</span>
                  </span>
                </div>
              )} />
              <Bar dataKey="bigger" barSize={50} fillOpacity={0.8} isAnimationActive={false}>
                {decryptData.map((d, i) => (
                  <Cell key={i} fill={d.biggerColor} />
                ))}
              </Bar>
              <Bar dataKey="smaller" barSize={34} fillOpacity={0.9} isAnimationActive={false}>
                {decryptData.map((d, i) => (
                  <Cell key={i} fill={d.smallerColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="eq-row">
        <EquationBreakdown
          a={{ label: configA.label, color: COLOR_A, shared: sharedA, sapling: saplingA, orchard: orchardA }}
          b={{ label: configB.label, color: COLOR_B, shared: sharedB, sapling: saplingB, orchard: orchardB }}
        />
      </div>
    </div>
  );
}

export default App;
