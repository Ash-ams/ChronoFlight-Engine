'use client';

import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Database,
  Terminal,
  ChevronRight,
  AlertTriangle,
  Search,
  Layers,
  BarChart3,
  Filter,
  Eye,
  Table2,
  Zap,
  Plane,
  Target,
  Brain,
} from 'lucide-react';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   QUERIES_CONFIG — All 15 evaluation queries
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface ChartConfig {
  type: 'bar' | 'pie' | 'none';
  xAxisKey?: string;
  yAxisKey?: string;
  nameKey?: string;
  valueKey?: string;
}

interface QueryConfig {
  id: number;
  title: string;
  category: string;
  syllabus: string;
  targetType: 'rpc' | 'view' | 'table';
  targetName: string;
  sqlString: string;
  description: string;
  expected: string;
  inference: string;
  chartConfig: ChartConfig;
}

const QUERIES_CONFIG: QueryConfig[] = [
  // ── Analytics ──────────────────────────────────────────────────────────
  {
    id: 1,
    title: 'Bottleneck Airports',
    category: 'Analytics',
    syllabus: 'Tests INNER JOIN, SUM, GROUP BY, ORDER BY with aggregate ranking',
    targetType: 'rpc',
    targetName: 'get_bottleneck_airports',
    description:
      'Analyzing the top airports contributing to network-wide delays by aggregating total delay minutes per departure hub.',
    expected:
      'Major international hubs with high traffic volumes will show the highest absolute delay minutes due to congestion and scheduling pressure.',
    inference:
      'If a single regional airport surfaces near the top, it signals a critical infrastructure bottleneck requiring immediate logistical review and capacity planning.',
    chartConfig: { type: 'bar', xAxisKey: 'airport_name', yAxisKey: 'total_delay_minutes' },
    sqlString: `-- RPC: get_bottleneck_airports
SELECT
    a.airport_name,
    a.city,
    COUNT(f.flight_id)        AS total_flights,
    AVG(f.delay_minutes)      AS avg_delay,
    SUM(f.delay_minutes)      AS total_delay_minutes
FROM airports a
INNER JOIN flights f
    ON a.airport_id = f.departure_airport_id
GROUP BY a.airport_name, a.city
ORDER BY avg_delay DESC
LIMIT 20;`,
  },
  {
    id: 2,
    title: 'Manufacturer Reliability',
    category: 'Analytics',
    syllabus: 'Tests multi-table JOIN, CASE WHEN, conditional aggregation',
    targetType: 'rpc',
    targetName: 'get_manufacturer_reliability',
    description:
      'Evaluating aircraft manufacturers by fleet-wide cancellation rates and average delay performance to assess operational reliability.',
    expected:
      'Established manufacturers like Boeing and Airbus should demonstrate lower cancellation rates, while smaller OEMs may exhibit higher variability.',
    inference:
      'A high cancellation rate from a specific manufacturer could indicate systemic fleet maintenance issues or design-related operational limitations.',
    chartConfig: { type: 'bar', xAxisKey: 'manufacturer_name', yAxisKey: 'avg_delay_per_flight' },
    sqlString: `-- RPC: get_manufacturer_reliability
SELECT
    ap.manufacturer,
    COUNT(DISTINCT ap.airplane_id)  AS fleet_size,
    COUNT(f.flight_id)              AS total_flights,
    AVG(f.delay_minutes)            AS avg_delay,
    SUM(CASE WHEN f.status = 'cancelled' THEN 1 ELSE 0 END) AS cancellations,
    ROUND(
        SUM(CASE WHEN f.status = 'cancelled' THEN 1 ELSE 0 END)::numeric
        / NULLIF(COUNT(f.flight_id), 0) * 100, 2
    ) AS cancellation_rate
FROM airplanes ap
INNER JOIN flights f ON ap.airplane_id = f.airplane_id
GROUP BY ap.manufacturer
ORDER BY avg_delay ASC;`,
  },
  {
    id: 3,
    title: 'Route Profitability',
    category: 'Analytics',
    syllabus: 'Tests multi-JOIN across 3+ tables, revenue aggregation, ROUND',
    targetType: 'rpc',
    targetName: 'get_route_profitability',
    description:
      'Ranking city-pair routes by total ticket revenue and passenger volume to identify the most commercially valuable corridors.',
    expected:
      'High-demand business routes between major metropolitan centers will dominate the top revenue positions.',
    inference:
      'Routes with high revenue but low unique passengers suggest premium pricing power, while high-volume low-revenue routes may benefit from yield optimization.',
    chartConfig: { type: 'bar', xAxisKey: 'origin', yAxisKey: 'total_passengers' },
    sqlString: `-- RPC: get_route_profitability
SELECT
    dep.city  AS origin_city,
    arr.city  AS destination_city,
    COUNT(f.flight_id)             AS total_flights,
    SUM(pm.ticket_price)           AS total_revenue,
    ROUND(AVG(pm.ticket_price), 2) AS avg_ticket_price,
    COUNT(DISTINCT pm.passenger_id) AS unique_passengers
FROM flights f
INNER JOIN airports dep ON f.departure_airport_id = dep.airport_id
INNER JOIN airports arr ON f.arrival_airport_id   = arr.airport_id
INNER JOIN passenger_manifests pm ON f.flight_id   = pm.flight_id
GROUP BY dep.city, arr.city
ORDER BY total_revenue DESC
LIMIT 20;`,
  },
  {
    id: 4,
    title: 'Weather Impact Analysis',
    category: 'Analytics',
    syllabus: 'Tests LEFT JOIN, GROUP BY on weather conditions, NULL handling',
    targetType: 'rpc',
    targetName: 'get_weather_impact',
    description:
      'Correlating weather conditions at departure airports with flight delays and cancellations to quantify environmental disruption.',
    expected:
      'Severe weather conditions (storms, fog, heavy snow) will exhibit substantially higher average delays and cancellation rates than clear-sky operations.',
    inference:
      'If "Clear" weather still shows non-trivial delays, the root cause is likely operational (crew scheduling, maintenance) rather than environmental.',
    chartConfig: { type: 'pie', nameKey: 'condition', valueKey: 'flight_count' },
    sqlString: `-- RPC: get_weather_impact
SELECT
    w.condition           AS weather_condition,
    COUNT(f.flight_id)    AS total_flights,
    AVG(f.delay_minutes)  AS avg_delay,
    MAX(f.delay_minutes)  AS max_delay,
    SUM(CASE WHEN f.status = 'cancelled' THEN 1 ELSE 0 END) AS cancellations
FROM flights f
LEFT JOIN weather_reports w
    ON f.departure_airport_id = w.airport_id
    AND f.departure_date      = w.report_date
GROUP BY w.condition
ORDER BY avg_delay DESC;`,
  },

  // ── Advanced Subqueries ────────────────────────────────────────────────
  {
    id: 5,
    title: 'High Delay Flights',
    category: 'Advanced Subqueries',
    syllabus: 'Tests correlated subquery, comparison with aggregate in WHERE',
    targetType: 'rpc',
    targetName: 'get_high_delays',
    description:
      'Identifying flights with delay minutes exceeding twice the network-wide average — the statistical outliers causing domino-effect disruptions.',
    expected:
      'A small subset of flights (< 5%) will account for a disproportionately large share of total delay minutes, following a Pareto distribution.',
    inference:
      'Repeated appearances of a specific airline or route in this list reveals systemic scheduling failures rather than isolated incidents.',
    chartConfig: { type: 'bar', xAxisKey: 'flight_no', yAxisKey: 'total_delay' },
    sqlString: `-- RPC: get_high_delays
SELECT
    f.flight_id,
    f.flight_number,
    f.delay_minutes,
    a.airline_name
FROM flights f
INNER JOIN airlines a ON f.airline_id = a.airline_id
WHERE f.delay_minutes > (
    SELECT AVG(delay_minutes) * 2
    FROM flights
    WHERE delay_minutes IS NOT NULL
)
ORDER BY f.delay_minutes DESC
LIMIT 50;`,
  },
  {
    id: 6,
    title: 'Boeing-Only Airlines',
    category: 'Advanced Subqueries',
    syllabus: 'Tests NOT EXISTS subquery, anti-join pattern',
    targetType: 'rpc',
    targetName: 'get_boeing_only_airlines',
    description:
      'Isolating airlines that exclusively operate Boeing aircraft using a NOT EXISTS anti-join, revealing single-manufacturer fleet strategies.',
    expected:
      'Only a handful of carriers will have pure Boeing fleets, typically smaller regional operators or those with strategic fleet commonality agreements.',
    inference:
      'Single-manufacturer dependency creates supply-chain risk but offers maintenance cost efficiencies — a strategic trade-off worth monitoring.',
    chartConfig: { type: 'none' },
    sqlString: `-- RPC: get_boeing_only_airlines
SELECT DISTINCT a.airline_name
FROM airlines a
INNER JOIN flights f  ON a.airline_id  = f.airline_id
INNER JOIN airplanes ap ON f.airplane_id = ap.airplane_id
WHERE ap.manufacturer = 'Boeing'
  AND NOT EXISTS (
      SELECT 1
      FROM flights f2
      INNER JOIN airplanes ap2 ON f2.airplane_id = ap2.airplane_id
      WHERE f2.airline_id = a.airline_id
        AND ap2.manufacturer <> 'Boeing'
  );`,
  },
  {
    id: 7,
    title: 'Multi-Airport Cities',
    category: 'Advanced Subqueries',
    syllabus: 'Tests HAVING clause, COUNT with GROUP BY, scalar subquery filter',
    targetType: 'rpc',
    targetName: 'get_multi_airport_cities',
    description:
      'Discovering metropolitan areas served by multiple airports, indicating high-demand aviation markets with competitive routing options.',
    expected:
      'Major global cities (New York, London, Tokyo) naturally support multiple airports. The query validates geographic normalization in the schema.',
    inference:
      'Cities with multiple airports present route-optimization opportunities — airlines can strategically balance load across hubs.',
    chartConfig: { type: 'bar', xAxisKey: 'city_name', yAxisKey: 'airport_count' },
    sqlString: `-- RPC: get_multi_airport_cities
SELECT
    city,
    COUNT(airport_id) AS airport_count,
    ARRAY_AGG(airport_name) AS airport_names
FROM airports
GROUP BY city
HAVING COUNT(airport_id) > 1
ORDER BY airport_count DESC;`,
  },

  // ── KPI Views ──────────────────────────────────────────────────────────
  {
    id: 8,
    title: 'Daily Flight Summary',
    category: 'KPI Views',
    syllabus: 'Tests CREATE VIEW, date-level aggregation, KPI dashboard pattern',
    targetType: 'view',
    targetName: 'vw_daily_flight_summary',
    description:
      'Providing a day-by-day operational dashboard view: total flights, average delay, and status breakdowns (on-time, delayed, cancelled).',
    expected:
      'Weekdays will show higher flight volumes with consistent delay averages, while weekends may exhibit lower traffic but variable delay patterns.',
    inference:
      'Spikes in the cancelled_count column on specific dates likely correlate with weather events or system-wide disruptions — cross-reference with weather data.',
    chartConfig: { type: 'bar', xAxisKey: 'flight_date', yAxisKey: 'total_flights' },
    sqlString: `-- VIEW: vw_daily_flight_summary
CREATE OR REPLACE VIEW vw_daily_flight_summary AS
SELECT
    f.departure_date,
    COUNT(f.flight_id)       AS total_flights,
    AVG(f.delay_minutes)     AS avg_delay,
    SUM(CASE WHEN f.status = 'on_time'   THEN 1 ELSE 0 END) AS on_time_count,
    SUM(CASE WHEN f.status = 'delayed'   THEN 1 ELSE 0 END) AS delayed_count,
    SUM(CASE WHEN f.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
FROM flights f
GROUP BY f.departure_date
ORDER BY f.departure_date DESC;`,
  },
  {
    id: 9,
    title: 'Active Airplanes',
    category: 'KPI Views',
    syllabus: 'Tests VIEW with JOIN, fleet utilization metric',
    targetType: 'view',
    targetName: 'vw_active_airplanes',
    description:
      'Listing all aircraft in the fleet with their utilization metrics — total flights operated, last active date, and average delay contribution.',
    expected:
      'High-capacity wide-body aircraft will log fewer total flights but longer routes, while narrow-body planes will show high-frequency short-haul utilization.',
    inference:
      'Aircraft with high avg_delay and low total_flights may be underperforming assets — candidates for maintenance review or fleet reallocation.',
    chartConfig: { type: 'none' },
    sqlString: `-- VIEW: vw_active_airplanes
CREATE OR REPLACE VIEW vw_active_airplanes AS
SELECT
    ap.airplane_id,
    ap.model,
    ap.manufacturer,
    ap.capacity,
    COUNT(f.flight_id)                  AS total_flights,
    MAX(f.departure_date)               AS last_flight_date,
    ROUND(AVG(f.delay_minutes), 2)      AS avg_delay
FROM airplanes ap
LEFT JOIN flights f ON ap.airplane_id = f.airplane_id
GROUP BY ap.airplane_id, ap.model, ap.manufacturer, ap.capacity
ORDER BY total_flights DESC;`,
  },

  // ── Simple Filters ─────────────────────────────────────────────────────
  {
    id: 10,
    title: 'All Flights (Sample)',
    category: 'Simple Filters',
    syllabus: 'Tests basic SELECT * with LIMIT, raw table scan',
    targetType: 'table',
    targetName: 'flights',
    description:
      'Retrieving the 50 most recent flight records for a raw snapshot of the core transactional table — the heartbeat of the aviation database.',
    expected:
      'A mix of on-time, delayed, and cancelled flights across multiple airlines and routes, reflecting realistic operational diversity.',
    inference:
      'Scanning raw data reveals column-level patterns (e.g., clustering of NULL delay_minutes for cancelled flights) that inform downstream query design.',
    chartConfig: { type: 'none' },
    sqlString: `-- TABLE: flights
SELECT *
FROM flights
ORDER BY departure_date DESC
LIMIT 50;`,
  },
  {
    id: 11,
    title: 'Passenger Manifests',
    category: 'Simple Filters',
    syllabus: 'Tests SELECT on junction / bridge table, ticket pricing data',
    targetType: 'table',
    targetName: 'passenger_manifests',
    description:
      'Scanning the passenger-flight junction table to examine booking patterns, seat classes, and ticket pricing distributions.',
    expected:
      'Ticket prices will cluster around economy-class ranges with premium outliers. Booking dates should precede departure dates by variable lead times.',
    inference:
      'This bridge table is critical for revenue analytics — any NULL ticket_price values indicate data quality issues that could skew profitability calculations.',
    chartConfig: { type: 'none' },
    sqlString: `-- TABLE: passenger_manifests
SELECT *
FROM passenger_manifests
ORDER BY booking_date DESC
LIMIT 50;`,
  },
  {
    id: 12,
    title: 'Airlines Directory',
    category: 'Simple Filters',
    syllabus: 'Tests simple reference table scan',
    targetType: 'table',
    targetName: 'airlines',
    description:
      'Listing all airline entities in the reference table — the master dimension table driving all carrier-level analytics.',
    expected:
      'A comprehensive directory of airlines with unique identifiers, enabling JOIN operations across the flight and manifest tables.',
    inference:
      'The total airline count defines the cardinality of carrier-level aggregations. Low cardinality means each airline has statistically significant sample sizes.',
    chartConfig: { type: 'none' },
    sqlString: `-- TABLE: airlines
SELECT *
FROM airlines
ORDER BY airline_name ASC;`,
  },
  {
    id: 13,
    title: 'Airports Directory',
    category: 'Simple Filters',
    syllabus: 'Tests geographic reference data, city/country attributes',
    targetType: 'table',
    targetName: 'airports',
    description:
      'Enumerating all airports with their geographic metadata — city and country attributes that power route-level and regional analyses.',
    expected:
      'A geographically diverse set of airports across multiple countries, providing the spatial dimension for network analysis.',
    inference:
      'The distribution of airports per city/country reveals the geographic scope of the dataset and potential biases in regional coverage.',
    chartConfig: { type: 'none' },
    sqlString: `-- TABLE: airports
SELECT *
FROM airports
ORDER BY city ASC;`,
  },
  {
    id: 14,
    title: 'Airplanes Fleet',
    category: 'Simple Filters',
    syllabus: 'Tests fleet inventory table, manufacturer & capacity columns',
    targetType: 'table',
    targetName: 'airplanes',
    description:
      'Surveying the complete fleet inventory — aircraft models, manufacturers, and passenger capacities that constrain operational planning.',
    expected:
      'A mix of manufacturers (Boeing, Airbus, Embraer, etc.) with capacities ranging from regional jets (~70 seats) to wide-body aircraft (~400+ seats).',
    inference:
      'Fleet composition directly impacts route assignment strategy — matching aircraft capacity to route demand is a key optimization lever.',
    chartConfig: { type: 'none' },
    sqlString: `-- TABLE: airplanes
SELECT *
FROM airplanes
ORDER BY manufacturer, model ASC;`,
  },
  {
    id: 15,
    title: 'Weather Reports',
    category: 'Simple Filters',
    syllabus: 'Tests environmental data table with date-keyed lookups',
    targetType: 'table',
    targetName: 'weather_reports',
    description:
      'Inspecting the weather observation records keyed by airport and date — the environmental dimension that drives delay causality analysis.',
    expected:
      'Daily weather snapshots covering conditions like Clear, Rain, Fog, Snow, and Storm across all airport locations in the dataset.',
    inference:
      'Gaps in weather data (missing airport-date combinations) will produce NULLs in LEFT JOIN analyses — understanding coverage is essential for accurate modeling.',
    chartConfig: { type: 'none' },
    sqlString: `-- TABLE: weather_reports
SELECT *
FROM weather_reports
ORDER BY report_date DESC
LIMIT 50;`,
  },
];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PIE CHART COLOR PALETTE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const PIE_COLORS = [
  '#22d3ee', // cyan-400
  '#06b6d4', // cyan-500
  '#0891b2', // cyan-600
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#64748b', // slate-500
  '#475569', // slate-600
  '#a855f7', // purple-500
  '#0ea5e9', // sky-500
];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CATEGORY ICONS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Analytics: <BarChart3 size={14} className="text-cyan-400" />,
  'Advanced Subqueries': <Search size={14} className="text-purple-400" />,
  'KPI Views': <Eye size={14} className="text-emerald-400" />,
  'Simple Filters': <Filter size={14} className="text-amber-400" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  Analytics: 'text-cyan-400',
  'Advanced Subqueries': 'text-purple-400',
  'KPI Views': 'text-emerald-400',
  'Simple Filters': 'text-amber-400',
};

const TARGET_BADGE: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  rpc: { label: 'RPC', icon: <Zap size={12} />, color: 'text-cyan-300 bg-cyan-900/40 border-cyan-500/30' },
  view: { label: 'VIEW', icon: <Eye size={12} />, color: 'text-emerald-300 bg-emerald-900/40 border-emerald-500/30' },
  table: { label: 'TABLE', icon: <Table2 size={12} />, color: 'text-amber-300 bg-amber-900/40 border-amber-500/30' },
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HELPER: format cell values for display
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CUSTOM TOOLTIP COMPONENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: 'rgba(8, 18, 54, 0.95)',
        border: '1px solid rgba(34, 211, 238, 0.3)',
        borderRadius: '8px',
        padding: '10px 14px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      {payload.map((entry: { name: string; value: number; color: string }, idx: number) => (
        <p key={idx} style={{ color: entry.color || '#22d3ee', fontSize: '13px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CUSTOM PIE TOOLTIP
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PieTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div
      style={{
        background: 'rgba(8, 18, 54, 0.95)',
        border: '1px solid rgba(34, 211, 238, 0.3)',
        borderRadius: '8px',
        padding: '10px 14px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <p style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>
        {entry.name}
      </p>
      <p style={{ color: '#22d3ee', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace" }}>
        {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value} flights
      </p>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   COMPONENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function Dashboard() {
  const [activeQueryId, setActiveQueryId] = useState<number>(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [queryData, setQueryData] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeQuery = useMemo(
    () => QUERIES_CONFIG.find((q) => q.id === activeQueryId)!,
    [activeQueryId],
  );

  /* Group queries by category */
  const grouped = useMemo(() => {
    const map = new Map<string, QueryConfig[]>();
    for (const q of QUERIES_CONFIG) {
      if (!map.has(q.category)) map.set(q.category, []);
      map.get(q.category)!.push(q);
    }
    return map;
  }, []);

  /* ── Data Fetching ────────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);
      setQueryData([]);

      try {
        let data: unknown = null;
        let fetchError: unknown = null;

        if (activeQuery.targetType === 'rpc') {
          const res = await supabase.rpc(activeQuery.targetName);
          data = res.data;
          fetchError = res.error;
        } else {
          // view or table
          const res = await supabase
            .from(activeQuery.targetName)
            .select('*')
            .limit(50);
          data = res.data;
          fetchError = res.error;
        }

        if (cancelled) return;

        if (fetchError) {
          setError(
            typeof fetchError === 'object' && fetchError !== null && 'message' in fetchError
              ? (fetchError as { message: string }).message
              : 'An unknown error occurred.',
          );
          return;
        }

        if (!data || (Array.isArray(data) && data.length === 0)) {
          setQueryData([]);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setQueryData(Array.isArray(data) ? (data as Record<string, any>[]) : [data as Record<string, any>]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unexpected error');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [activeQuery]);

  /* ── Derived data for the table ────────────────────────────────────── */
  const columns = useMemo(() => {
    if (queryData.length === 0) return [];
    return Object.keys(queryData[0]);
  }, [queryData]);

  const badge = TARGET_BADGE[activeQuery.targetType];

  /* ── Truncate long xAxis labels for bar charts ─────────────────────── */
  const truncateLabel = (label: string, maxLen = 14) => {
    if (!label) return '';
    const str = String(label);
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
  };

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     RENDER
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  return (
    <div className="dashboard-shell flex h-screen overflow-hidden" style={{ background: '#030712', fontFamily: "'Inter', sans-serif" }}>
      {/* ────────────────────── SIDEBAR ────────────────────── */}
      <aside
        className="flex-shrink-0 flex flex-col border-r border-slate-800/80 overflow-y-auto transition-all duration-300"
        style={{
          width: sidebarOpen ? '20rem' : '0rem',
          minWidth: sidebarOpen ? '20rem' : '0rem',
          background: 'linear-gradient(180deg, rgba(3,7,18,0.97) 0%, rgba(8,18,54,0.45) 100%)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Logo strip */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/60">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg overflow-hidden shrink-0">
            <Image src="/logo.png" width={36} height={36} alt="ChronoFlight Logo" className="object-contain w-full h-full drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>
              ChronoFlight
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Evaluation Console</p>
          </div>
        </div>

        {/* Query list grouped by category */}
        <nav className="flex-1 px-3 py-4 space-y-5">
          {Array.from(grouped.entries()).map(([category, queries]) => (
            <div key={category}>
              {/* Section header */}
              <div className="flex items-center gap-2 px-2 mb-2">
                {CATEGORY_ICONS[category]}
                <span className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${CATEGORY_COLORS[category]}`}>
                  {category}
                </span>
                <span className="text-[10px] text-slate-600 ml-auto">{queries.length}</span>
              </div>

              {/* Buttons */}
              <div className="space-y-0.5">
                {queries.map((q) => {
                  const isActive = q.id === activeQueryId;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setActiveQueryId(q.id)}
                      className={`
                        w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] transition-all duration-200
                        ${
                          isActive
                            ? 'bg-cyan-900/40 border border-cyan-400/50 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.08)]'
                            : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }
                      `}
                    >
                      <span
                        className={`
                          flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold
                          ${isActive ? 'bg-cyan-400/20 text-cyan-300' : 'bg-slate-800 text-slate-500'}
                        `}
                      >
                        {q.id}
                      </span>
                      <span className="truncate">{q.title}</span>
                      {isActive && <ChevronRight size={14} className="ml-auto text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800/60">
          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            <Database size={12} />
            <span>Supabase + PostgreSQL</span>
          </div>
        </div>
      </aside>

      {/* ────────────────────── MOBILE TOGGLE ────────────────────── */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white transition"
      >
        <Layers size={16} />
      </button>

      {/* ────────────────────── MAIN STAGE ────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8 space-y-8">
          {/* ── HEADER ─────────────────────────────────────────── */}
          <motion.header
            key={activeQuery.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="flex flex-wrap items-start gap-4">
              {/* Title block */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {activeQuery.title}
                  </h2>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${badge.color}`}>
                    {badge.icon}
                    {badge.label}
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  <Terminal size={13} className="inline mr-1.5 -mt-0.5 text-slate-500" />
                  {activeQuery.syllabus}
                </p>
              </div>

              {/* Query counter */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider">Query</span>
                <span className="text-lg font-bold text-cyan-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {String(activeQuery.id).padStart(2, '0')}
                </span>
                <span className="text-[11px] text-slate-600">/ 15</span>
              </div>
            </div>

            {/* Divider glow line */}
            <div className="mt-5 h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(34,211,238,0.4) 0%, rgba(34,211,238,0.05) 60%, transparent 100%)' }} />
          </motion.header>

          {/* ── ANALYSIS CARDS (Description / Expected / Inference) ── */}
          <motion.section
            key={`analysis-${activeQuery.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Description Card */}
              <div
                className="p-5 rounded-xl border border-slate-700/60 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.05)]"
                style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(12px)' }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-900/30 border border-cyan-500/20">
                    <Search size={15} className="text-cyan-400" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-400">
                    What We&apos;re Searching
                  </span>
                </div>
                <p className="text-[13px] text-slate-300 leading-relaxed">
                  {activeQuery.description}
                </p>
              </div>

              {/* Expected Card */}
              <div
                className="p-5 rounded-xl border border-slate-700/60 transition-all duration-300 hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.05)]"
                style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(12px)' }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-900/30 border border-purple-500/20">
                    <Target size={15} className="text-purple-400" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-purple-400">
                    Expected Outcome
                  </span>
                </div>
                <p className="text-[13px] text-slate-300 leading-relaxed">
                  {activeQuery.expected}
                </p>
              </div>

              {/* Inference Card */}
              <div
                className="p-5 rounded-xl border border-slate-700/60 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(12px)' }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-900/30 border border-emerald-500/20">
                    <Brain size={15} className="text-emerald-400" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
                    Data Inference
                  </span>
                </div>
                <p className="text-[13px] text-slate-300 leading-relaxed">
                  {activeQuery.inference}
                </p>
              </div>
            </div>
          </motion.section>

          {/* ── DATA TABLE ─────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers size={14} className="text-cyan-500" />
                Result Set
              </h3>
              {!isLoading && !error && (
                <span className="text-[11px] text-slate-500">
                  {queryData.length} row{queryData.length !== 1 ? 's' : ''} returned
                </span>
              )}
            </div>

            <div
              className="rounded-xl border border-slate-800/80 overflow-hidden"
              style={{ background: 'linear-gradient(180deg, rgba(8,18,54,0.3) 0%, rgba(3,7,18,0.6) 100%)' }}
            >
              <AnimatePresence mode="wait">
                {/* LOADING STATE */}
                {isLoading && (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-24 gap-4"
                  >
                    <div
                      className="w-10 h-10 rounded-full border-2 border-cyan-400/30 border-t-cyan-400"
                      style={{ animation: 'spin-slow 1s linear infinite, pulse-glow 2s ease-in-out infinite' }}
                    />
                    <p className="text-sm text-slate-500">Executing query&hellip;</p>
                  </motion.div>
                )}

                {/* ERROR STATE */}
                {!isLoading && error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20 gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-900/30 border border-red-500/30 flex items-center justify-center">
                      <AlertTriangle size={22} className="text-red-400" />
                    </div>
                    <p className="text-sm text-red-300 font-medium">Query Error</p>
                    <p className="text-xs text-slate-500 max-w-md text-center">{error}</p>
                  </motion.div>
                )}

                {/* EMPTY STATE */}
                {!isLoading && !error && queryData.length === 0 && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20 gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                      <Database size={20} className="text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-400">No rows returned</p>
                    <p className="text-[11px] text-slate-600">The query executed successfully but produced an empty result set.</p>
                  </motion.div>
                )}

                {/* DATA TABLE */}
                {!isLoading && !error && queryData.length > 0 && (
                  <motion.div
                    key="table"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-x-auto"
                    style={{ maxHeight: '420px', overflowY: 'auto' }}
                  >
                    <table className="w-full text-sm text-left">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-slate-700/50">
                          {columns.map((col) => (
                            <th
                              key={col}
                              className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap"
                              style={{ background: 'rgba(8,18,54,0.95)' }}
                            >
                              {col.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryData.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-slate-800/40 hover:bg-cyan-900/10 transition-colors duration-150"
                          >
                            {columns.map((col) => (
                              <td
                                key={col}
                                className="px-4 py-2.5 text-slate-300 whitespace-nowrap"
                                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}
                              >
                                {formatCell(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* ── VISUALIZATION (Recharts) ───────────────────────── */}
          {activeQuery.chartConfig.type !== 'none' && !isLoading && !error && queryData.length > 0 && (
            <motion.section
              key={`chart-${activeQuery.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 size={14} className="text-cyan-500" />
                  Visualization
                </h3>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider">
                  {activeQuery.chartConfig.type === 'bar' ? 'Bar Chart' : 'Distribution'}
                </span>
              </div>

              <div
                className="rounded-xl border border-slate-800/80 p-6 overflow-hidden"
                style={{ background: 'linear-gradient(180deg, rgba(8,18,54,0.3) 0%, rgba(3,7,18,0.6) 100%)' }}
              >
                {/* ─── BAR CHART ─── */}
                {activeQuery.chartConfig.type === 'bar' && activeQuery.chartConfig.xAxisKey && activeQuery.chartConfig.yAxisKey && (
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart
                      data={queryData.slice(0, 20)}
                      margin={{ top: 10, right: 30, left: 10, bottom: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                      <XAxis
                        dataKey={activeQuery.chartConfig.xAxisKey}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                        tickFormatter={(v) => truncateLabel(v)}
                        angle={-35}
                        textAnchor="end"
                        axisLine={{ stroke: 'rgba(148, 163, 184, 0.15)' }}
                        tickLine={{ stroke: 'rgba(148, 163, 184, 0.1)' }}
                        interval={0}
                        height={60}
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                        axisLine={{ stroke: 'rgba(148, 163, 184, 0.15)' }}
                        tickLine={{ stroke: 'rgba(148, 163, 184, 0.1)' }}
                        tickFormatter={(v) => typeof v === 'number' ? v.toLocaleString() : v}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(34, 211, 238, 0.06)' }} />
                      <Bar
                        dataKey={activeQuery.chartConfig.yAxisKey}
                        fill="#22d3ee"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={48}
                      >
                        {queryData.slice(0, 20).map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={`hsl(${185 + index * 3}, 85%, ${55 - index * 1.5}%)`}
                            fillOpacity={0.85}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {/* ─── PIE / DONUT CHART ─── */}
                {activeQuery.chartConfig.type === 'pie' && activeQuery.chartConfig.nameKey && activeQuery.chartConfig.valueKey && (
                  <ResponsiveContainer width="100%" height={360}>
                    <PieChart>
                      <Pie
                        data={queryData}
                        dataKey={activeQuery.chartConfig.valueKey}
                        nameKey={activeQuery.chartConfig.nameKey}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={140}
                        paddingAngle={3}
                        stroke="rgba(3, 7, 18, 0.8)"
                        strokeWidth={2}
                      >
                        {queryData.map((_, index) => (
                          <Cell
                            key={`pie-cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                            fillOpacity={0.9}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => (
                          <span style={{ color: '#94a3b8', fontSize: '11px', fontFamily: "'Inter', sans-serif" }}>
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.section>
          )}

          {/* ── SQL SOURCE CODE ────────────────────────────────── */}
          <motion.section
            key={`sql-${activeQuery.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Terminal size={14} className="text-cyan-500" />
                PostgreSQL Source Logic
              </h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${badge.color}`}>
                {activeQuery.targetName}
              </span>
            </div>

            <div
              className="rounded-xl border border-slate-800/80 overflow-hidden"
              style={{ background: 'rgba(3,7,18,0.8)' }}
            >
              <SyntaxHighlighter
                language="sql"
                style={atomDark}
                customStyle={{
                  background: 'transparent',
                  margin: 0,
                  padding: '1.5rem',
                  fontSize: '13px',
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: '1.7',
                }}
                showLineNumbers
                lineNumberStyle={{
                  color: 'rgba(148, 163, 184, 0.25)',
                  marginRight: '1rem',
                  fontSize: '11px',
                }}
              >
                {activeQuery.sqlString}
              </SyntaxHighlighter>
            </div>
          </motion.section>

          {/* Bottom spacer */}
          <div className="h-8" />
        </div>
      </main>
    </div>
  );
}
