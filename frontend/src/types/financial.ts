// =====================================================
// 💎 FINAI — GLOBAL FINANCIAL TYPE SYSTEM
// =====================================================

/* =====================================================
   🌍 GLOBAL TYPES
===================================================== */

export type CurrencyCode =
  | "USD" | "EUR" | "GBP" | "JPY"
  | "CAD" | "AUD" | "CNY";

export type RegionCode =
  | "US" | "CA" | "GB" | "EU"
  | "JP" | "AU" | "CN";

export type EmploymentType =
  | "salary"
  | "full_time"
  | "part_time"
  | "self_employed"
  | "freelance"
  | "contract"
  | "student"
  | "retired"
  | "unemployed";

export type RiskTolerance =
  | "conservative"
  | "moderate"
  | "aggressive";

export type InvestmentExperience =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert";

export type FinancialGoalType =
  | "emergency_fund"
  | "pay_off_debt"
  | "save_for_home"
  | "grow_investments"
  | "retirement";

export type LifestylePriority =
  | "minimalist"
  | "balanced"
  | "comfortable";

export type IncomeStability =
  | "very_stable"
  | "stable"
  | "variable"
  | "unpredictable";

export type PurchaseCategory =
  | "housing"
  | "vehicle"
  | "education"
  | "business"
  | "experience"
  | "other";

export type RiskLevel =
  | "low"
  | "moderate"
  | "high"
  | "critical";

export type ExplanationBand =
  | "improving"
  | "stable"
  | "early_drift"
  | "concerning_drift";

export type InsightSeverity =
  | "low"
  | "medium"
  | "high";

/* =====================================================
   🌍 CONTEXT
===================================================== */

export interface FinancialContext {
  inflation_environment?: string;
  macro_environment?: string;
  recession_risk?: number;
  interest_rate_environment?: string;
  regional_outlook?: string;
}

/* =====================================================
   📊 ECONOMIC ASSUMPTIONS
===================================================== */

export interface EconomicAssumptions {
  annual_return: number;
  annual_inflation: number;
  source: "user" | "default" | "regional";
}

/* =====================================================
   👤 PROFILE
===================================================== */

export interface FinancialProfile {

  // Demographics
  age?: number;
  employment_type?: EmploymentType;
  region?: RegionCode;
  currency?: CurrencyCode;
  timezone?: string;

  // Location
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;

  // Risk & investment
  risk_tolerance?: RiskTolerance;
  investment_experience?: InvestmentExperience;

  // Financial snapshot
  savings_buffer?: number;
  existing_debt?: number;
  savings_amount?: number;
  debt_amount?: number;
  emergency_fund_months?: number;

  // Behavioral
  lifestyle_priority?: LifestylePriority;
  income_stability?: IncomeStability;
  financial_goal?: FinancialGoalType;

  // Lifestyle utility
  family_value?: number;
  personal_satisfaction?: number;
  commute_improvement?: boolean;
}

/* =====================================================
   🎯 GOALS
===================================================== */

export interface FinancialGoal {
  goal_cost?: number;
  goal_monthly_contribution?: number;
  decision_horizon_years?: number;
}

/* =====================================================
   💳 COMMITMENT LOCK REQUEST
===================================================== */

export interface CommitmentLockRequest {

  // Metadata
  schema_version?: string;
  request_id?: string;
  trace_id?: string;
  client_timestamp?: string;
  client_version?: string;
  request_origin?: "web" | "mobile" | "api" | "partner";

  // Core financials
  monthly_payment: number;
  term_months: number;
  net_monthly_income?: number;
  current_free_cashflow?: number;

  // Global context
  currency?: CurrencyCode;
  region?: RegionCode;
  timezone?: string;
  context?: FinancialContext;

  // Economic
  annual_return_assumption?: number;
  annual_inflation_assumption?: number;

  // Purchase
  purchase_category?: PurchaseCategory;
  decision_horizon_years?: number;

  // Goals
  goal_cost?: number;
  goal_monthly_contribution?: number;

  // Demographics
  age?: number;
  employment_type?: EmploymentType;

  // Risk & investment
  risk_tolerance?: RiskTolerance;
  investment_experience?: InvestmentExperience;

  // Financial snapshot
  savings_buffer?: number;
  existing_debt?: number;
  emergency_fund_months?: number;

  // Behavioral
  lifestyle_priority?: LifestylePriority;
  income_stability?: IncomeStability;
  financial_goal?: FinancialGoalType;

  // Lifestyle utility
  family_value?: number;
  personal_satisfaction?: number;
  commute_improvement?: boolean;
}

/* =====================================================
   📊 FINANCIAL ANALYSIS REQUEST
===================================================== */

export interface FinancialAnalysisRequest {

  // Metadata
  schema_version?: string;
  request_id?: string;
  trace_id?: string;
  client_timestamp?: string;
  request_origin?: "web" | "mobile" | "api" | "partner";

  // Core financials
  monthly_income?: number;
  monthly_expenses?: number;
  total_assets?: number;
  total_liabilities?: number;
  monthly_investments?: number;

  // Commitment
  monthly_payment?: number;
  term_months?: number;
  purchase_category?: PurchaseCategory;

  // Global context
  currency?: CurrencyCode;
  region?: RegionCode;
  timezone?: string;

  // Demographics
  age?: number;
  employment_type?: EmploymentType;

  // Risk & investment
  risk_tolerance?: RiskTolerance;
  investment_experience?: InvestmentExperience;

  // Financial snapshot
  savings_buffer?: number;
  existing_debt?: number;
  emergency_fund_months?: number;

  // Behavioral
  lifestyle_priority?: LifestylePriority;
  income_stability?: IncomeStability;
  financial_goal?: FinancialGoalType;

  // Lifestyle utility
  family_value?: number;
  personal_satisfaction?: number;
  commute_improvement?: boolean;

  // Goal modeling
  goal_cost?: number;
  goal_monthly_contribution?: number;
  decision_horizon_years?: number;

  // Engine toggles
  include_commitment_engine?: boolean;
  include_portfolio_engine?: boolean;
  include_policy_engine?: boolean;
  include_scenario_engine?: boolean;
}

/* =====================================================
   🔍 REASON CODE
===================================================== */

export interface ReasonCode {
  code: string;
  severity: InsightSeverity;
  message: string;
}

/* =====================================================
   💰 HEALTH SNAPSHOT
===================================================== */

export interface FinancialHealthSnapshot {
  income?: number;
  expenses?: number;
  savings_rate?: number;
  cashflow?: number;
}

/* =====================================================
   📈 SCENARIO RESULT
===================================================== */

export interface ScenarioResult {
  name?: string;
  global_financial_score?: number;
  explanation_band?: ExplanationBand;
  key_risks?: string[];
  key_strengths?: string[];
  summary?: string;
  confidence?: number;
  probability?: number;
  projected_cashflow?: number;
  projected_savings_rate?: number;
  projected_optionalities?: string[];
  projected_constraints?: string[];
  [key: string]: unknown;
}

/* =====================================================
   ⚙️ ENGINE OUTPUT
===================================================== */

export interface EngineOutput {
  engine_version?: string;
  engine_confidence?: string;
  processing_ms?: number;
  findings?: unknown[];
  metrics?: Record<string, unknown>;
  summary?: string;
  [key: string]: unknown;
}

/* =====================================================
   🧠 ENGINE COLLECTION
===================================================== */

export interface FinancialEngines {
  policy?: EngineOutput;
  portfolio?: EngineOutput;
  commitment?: EngineOutput;
  scenarios?: {
    scenario_results?: ScenarioResult[];
    best_scenario?: string;
    worst_scenario?: string;
    summary?: string;
    [key: string]: unknown;
  };
  behavioral_drift?: EngineOutput;
  financial_identity?: EngineOutput;
  financial_optionality?: EngineOutput;
  financial_resilience?: EngineOutput;
  utility_tradeoff?: EngineOutput;
  regret_minimization?: EngineOutput;
  option_value?: EngineOutput;
  macro_sensitivity?: EngineOutput;
  peer_benchmark?: EngineOutput;
  peer_trajectory?: EngineOutput;
  shock_simulator?: EngineOutput;
  lifestyle_utility?: EngineOutput;
  [key: string]: unknown;
}

/* =====================================================
   📦 ANALYSIS RESPONSE
===================================================== */

export interface FinancialAnalysisResponse {
  status?: string;
  request_id?: string;
  run_id?: string;
  trace_id?: string;
  schema_version?: string;
  generated_at?: string;
  processing_ms?: number;
  currency?: CurrencyCode;
  region?: RegionCode;
  global_financial_score?: number;
  risk_level?: RiskLevel;
  financial_health?: FinancialHealthSnapshot;
  explanation?: string;
  summary?: string;
  reason_codes?: ReasonCode[];
  economic_assumptions?: EconomicAssumptions;
  data_completeness?: number;
  engine_count?: number;
  engines?: FinancialEngines;
  engine_timings?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

/* =====================================================
   🧪 SIMULATION
===================================================== */

export interface FinancialSimulation {
  id: string;
  name: string;
  amount: number;
  term: number;
  category: PurchaseCategory;
  created_at: string;
  result: FinancialAnalysisResponse;
  // AI-generated plain-English explanation of this simulation's
  // result, generated once server-side at creation time. Optional
  // since simulations created before this feature existed (or saved
  // locally-only if the backend persist call failed) won't have one.
  narrative?: string | null;
}

/* =====================================================
   💳 TRANSACTION
===================================================== */

export interface FinancialTransaction {
  id?: number;
  amount: number;
  category: string;
  created_at?: string;
  note?: string;
  merchant?: string;
}

/* =====================================================
   📊 DASHBOARD
===================================================== */

export interface DashboardSummary {
  total_spending: number;
  total_income: number;
  disposable_income: number;
  savings_rate: number;
  category_breakdown: Record<string, number>;
}

/* =====================================================
   🚨 ANALYSIS STATE
===================================================== */

export interface AnalysisState {
  analysis: FinancialAnalysisResponse | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  lastAnalyzedAt: number | null;
}

/* =====================================================
   🎨 CATEGORY
===================================================== */

export interface Category {
  id?: string;
  name: string;
  icon?: string;
  budget?: number;
  spent?: number;
  is_default?: boolean;
}

/* =====================================================
   📝 DRAFT TRANSACTION
===================================================== */

export interface DraftTransaction {
  amount: string;
  category: string | null;
}