const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface District {
  id: number;
  name: string;
}

export interface Village {
  id: number;
  name: string;
}

export interface DashboardMetrics {
  total_budget: number;
  top_sector: string;
  yoy_change: number;
}

export interface DashboardData {
  village_id: number;
  village_name: string;
  district_name: string;
  fiscal_year: number;
  metrics: DashboardMetrics;
  ai_narrative: string;
  chart_single: Record<string, unknown>;
  chart_yearly: Record<string, unknown>;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function fetchDistricts(): Promise<District[]> {
  return apiFetch("/api/districts");
}

export function fetchVillages(districtId: number): Promise<Village[]> {
  return apiFetch(`/api/districts/${districtId}/villages`);
}

export function fetchDashboard(villageId: number): Promise<DashboardData> {
  return apiFetch(`/api/villages/${villageId}/dashboard`);
}

export function getQrisImageUrl(): string {
  return `${API_BASE}/api/donate/qris`;
}
