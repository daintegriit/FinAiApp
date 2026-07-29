// =====================================================
// 💎 FINAI — FINANCIAL ORCHESTRATOR CLIENT
// =====================================================
// FILE:
// src/services/financialOrchestrator.ts
// =====================================================

import axios from "axios";

import type {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
} from "axios";

import { Platform } from "react-native";

import type {
  CommitmentLockRequest,
  FinancialAnalysisResponse,
  FinancialSimulation,
  RiskLevel,
  ExplanationBand,
} from "../../src/types/financial";

/* =====================================================
   🌍 ENV / BASE URL
===================================================== */

const DEV_MACHINE_IP =
  "192.168.50.47";

const DEV_PORT =
  "8080";

const BASE_URL =
  __DEV__
    ? Platform.OS === "android"
      ? `http://10.0.2.2:${DEV_PORT}/api`
      : `http://${DEV_MACHINE_IP}:${DEV_PORT}/api`
    : "https://api.finbudgetai.com/api";

/* =====================================================
   ⚙️ AXIOS INSTANCE
===================================================== */

const api: AxiosInstance =
  axios.create({

    baseURL: BASE_URL,

    timeout: 30000,

    headers: {

      "Content-Type":
        "application/json",

      Accept:
        "application/json",
    },
  });

/* =====================================================
   🧠 REQUEST LOGGING
===================================================== */

api.interceptors.request.use(

  (request) => {

    console.log(
      "🚀 FINAI REQUEST",
      {

        url:
          `${BASE_URL}${request.url}`,

        method:
          request.method,

        data:
          request.data,
      }
    );

    return request;
  },

  (error) => {

    console.error(
      "❌ FINAI REQUEST FAILURE",
      normalizeAxiosError(error).message
    );

    return Promise.reject(error);
  }
);

/* =====================================================
   🧠 RESPONSE LOGGING
===================================================== */

api.interceptors.response.use(

  (response) => {

    console.log(
      "✅ FINAI RESPONSE",
      {

        url:
          response.config.url,

        status:
          response.status,

        data:
          response.data,
      }
    );

    return response;
  },

  (error) => {

    console.error(
      "❌ FINAI RESPONSE FAILURE",
      normalizeAxiosError(error).message
    );

    return Promise.reject(error);
  }
);

/* =====================================================
   🚨 ERROR NORMALIZER
===================================================== */

function normalizeAxiosError(
  error: unknown
): Error {

  if (
    (error as AxiosError)
      ?.isAxiosError
  ) {

    const axiosError =
      error as AxiosError<any>;

    const detail =
      axiosError.response
        ?.data?.detail;

    const message =

      typeof detail ===
      "string"

        ? detail

        : detail?.message ||

          axiosError.response
            ?.data?.message ||

          axiosError.message ||

          "Financial orchestration failed";

    return new Error(message);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(
    "Unknown orchestration error"
  );
}

/* =====================================================
   🧠 RESPONSE NORMALIZER
===================================================== */

function normalizeFinancialAnalysis(
  raw: any
): FinancialAnalysisResponse {

  return {

    status:
      raw?.status || "success",

    request_id:
      raw?.request_id,

    run_id:
      raw?.run_id,

    trace_id:
      raw?.trace_id,

    schema_version:
      raw?.schema_version ||
      "2.0",

    generated_at:
      raw?.generated_at ||
      new Date().toISOString(),

    processing_ms:
      Number(
        raw?.processing_ms || 0
      ),

    currency:
      raw?.currency || "USD",

    region:
      raw?.region || "US",

    global_financial_score:
      raw?.global_financial_score !==
        undefined &&
      raw?.global_financial_score !==
        null

        ? Number(
            raw.global_financial_score
          )

        : 0,

    risk_level:
      (
        raw?.risk_level ||
        "moderate"
      ) as RiskLevel,

    financial_health:
      raw?.financial_health,

    explanation:
      raw?.explanation,

    summary:
      raw?.summary ||
      raw?.engines
        ?.scenarios?.summary,

    data_completeness:
      raw?.data_completeness,

    engine_count:
      raw?.engine_count,

    engines:
      raw?.engines || {},

    engine_timings:
      raw?.engine_timings || {},
  };
}

/* =====================================================
   🔁 RETRY HELPER
===================================================== */

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 900
): Promise<T> {

  let lastError: unknown;

  for (
    let attempt = 0;
    attempt <= retries;
    attempt++
  ) {

    try {

      return await fn();

    } catch (error) {

      lastError = error;

      const isLast =
        attempt === retries;

      console.warn(
        `⚠️ FINAI retry ${
          attempt + 1
        }/${retries + 1}`
      );

      if (!isLast) {

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              delayMs
            )
        );
      }
    }
  }

  throw lastError;
}

/* =====================================================
   🧼 PAYLOAD NORMALIZER
===================================================== */

function normalizeRequest(
  request: CommitmentLockRequest
): CommitmentLockRequest {

  return {

    schema_version:
      request.schema_version ||
      "2.0",

    client_timestamp:
      request.client_timestamp ||
      new Date().toISOString(),

    request_origin:
      request.request_origin ||
      "mobile",

    currency:
      request.currency ||
      "USD",

    region:
      request.region ||
      "US",

    timezone:
      request.timezone ||
      "UTC",

    monthly_payment:
      Math.max(
        1,
        Number(
          request.monthly_payment || 1
        )
      ),

    term_months:
      Math.max(
        1,
        Number(
          request.term_months || 36
        )
      ),

    net_monthly_income:
      request.net_monthly_income !==
      undefined

        ? Math.max(
            1,
            Number(
              request.net_monthly_income
            )
          )

        : undefined,

    current_free_cashflow:
      request.current_free_cashflow !==
      undefined

        ? Math.max(
            1,
            Number(
              request.current_free_cashflow
            )
          )

        : undefined,

    purchase_category:
      request.purchase_category ||
      "other",

    decision_horizon_years:
      request.decision_horizon_years ||
      30,

    annual_return_assumption:
      request.annual_return_assumption,

    annual_inflation_assumption:
      request.annual_inflation_assumption,

    goal_cost:
      request.goal_cost,

    goal_monthly_contribution:
      request.goal_monthly_contribution,

    age:
      request.age,

    employment_type:
      request.employment_type,

    client_version:
      request.client_version,

    trace_id:
      request.trace_id,

    request_id:
      request.request_id,

    context:
      request.context,

    lifestyle_priority:
      request.lifestyle_priority,

    family_value:
      request.family_value,

    personal_satisfaction:
      request.personal_satisfaction,

    income_stability:
      request.income_stability,

    savings_buffer:
      request.savings_buffer,

    existing_debt:
      request.existing_debt,
  };
}

/* =====================================================
   ✅ RESPONSE VALIDATOR
===================================================== */

function assertValidResponse(
  response: AxiosResponse<any>
) {

  if (!response?.data) {

    throw new Error(
      "Backend returned empty response"
    );
  }

  if (
    typeof response.data !==
    "object"
  ) {

    throw new Error(
      "Backend returned invalid response"
    );
  }
}

/* =====================================================
   🧠 ANALYTICS HELPERS
===================================================== */

export function getFinancialScore(
  analysis?:
    | FinancialAnalysisResponse
    | null
): number {

  return Math.round(
    Number(
      analysis
        ?.global_financial_score || 0
    )
  );
}

export function calculateResilienceScore(
  analysis?:
    | FinancialAnalysisResponse
    | null
): number {

  if (!analysis) {
    return 0;
  }

  const score =
    getFinancialScore(
      analysis
    );

  const risk: RiskLevel =
    analysis?.risk_level ||
    "moderate";

  let modifier = 0;

  if (risk === "low") {
    modifier += 12;
  }

  if (risk === "moderate") {
    modifier += 4;
  }

  if (risk === "high") {
    modifier -= 12;
  }

  if (risk === "critical") {
    modifier -= 22;
  }

  return Math.max(
    0,

    Math.min(
      100,
      score + modifier
    )
  );
}

export function calculateOptionalityScore(
  analysis?:
    | FinancialAnalysisResponse
    | null
): number {

  if (!analysis) {
    return 0;
  }

  const score =
    getFinancialScore(
      analysis
    );

  const band: ExplanationBand =

    analysis?.engines
      ?.scenarios
      ?.scenario_results?.[0]
      ?.explanation_band ||

    "stable";

  let modifier = 0;

  if (band === "improving") {
    modifier += 10;
  }

  if (band === "stable") {
    modifier += 4;
  }

  if (band === "early_drift") {
    modifier -= 8;
  }

  if (
    band === "concerning_drift"
  ) {
    modifier -= 18;
  }

  return Math.max(
    0,

    Math.min(
      100,
      score + modifier
    )
  );
}

export function generateExecutiveSummary(
  analysis?:
    | FinancialAnalysisResponse
    | null
): string {

  if (!analysis) {

    return (
      "No financial intelligence available."
    );
  }

  const score =
    getFinancialScore(
      analysis
    );

  const risk: RiskLevel =
    analysis?.risk_level ||
    "moderate";

  const band: ExplanationBand =

    analysis?.engines
      ?.scenarios
      ?.scenario_results?.[0]
      ?.explanation_band ||

    "stable";

  if (risk === "critical") {

    return (
      "Financial trajectory analysis indicates elevated long-term pressure accumulation and materially reduced resilience capacity."
    );
  }

  if (risk === "high") {

    return (
      "Current financial structure remains operational but demonstrates elevated exposure to volatility and recurring obligation pressure."
    );
  }

  if (
    band === "improving" &&
    score >= 70
  ) {

    return (
      "Financial indicators suggest strengthening resilience, improving optionality, and favorable long-term sustainability trends."
    );
  }

  if (
    band === "concerning_drift"
  ) {

    return (
      "Behavioral drift indicators suggest worsening long-term resilience and increasing future instability exposure."
    );
  }

  return (
    "Financial trajectory currently remains relatively stable with manageable long-term pressure exposure."
  );
}

/* =====================================================
   💎 FINANCIAL ORCHESTRATOR
===================================================== */

class FinancialOrchestratorClient {

  async analyzeFinancialState(
    request: CommitmentLockRequest
  ): Promise<FinancialAnalysisResponse> {

    try {

      const payload =
        normalizeRequest(
          request
        );

      const response =
        await withRetry(() =>
          api.post(
            "/financial/analyze",
            payload
          )
        );

      assertValidResponse(
        response
      );

      return normalizeFinancialAnalysis(
        response.data
      );

    } catch (error) {

      throw normalizeAxiosError(
        error
      );
    }
  }

  async runSimulation(
    simulation: FinancialSimulation,

    base?: Partial<
      CommitmentLockRequest
    >
  ): Promise<
    FinancialAnalysisResponse
  > {

    const payload:
      CommitmentLockRequest = {

      ...base,

      monthly_payment:
        simulation.amount,

      term_months:
        simulation.term,

      purchase_category:
        simulation.category,

      currency:
        base?.currency ||
        "USD",

      region:
        base?.region ||
        "US",

      request_origin:
        "mobile",

      schema_version:
        "2.0",
    };

    return this.analyzeFinancialState(
      payload
    );
  }

  async runScenarioComparison(
    scenarios:
      CommitmentLockRequest[]
  ): Promise<
    FinancialAnalysisResponse[]
  > {

    return Promise.all(

      scenarios.map(
        (scenario) =>
          this.analyzeFinancialState(
            scenario
          )
      )
    );
  }

  async healthCheck(): Promise<{
    status: string;
    environment?: string;
  }> {

    try {

      const response =
        await api.get(
          "/health"
        );

      return response.data;

    } catch (error) {

      throw normalizeAxiosError(
        error
      );
    }
  }

  async getSystemInfo(): Promise<any> {

    try {

      const response =
        await api.get("/");

      return response.data;

    } catch (error) {

      throw normalizeAxiosError(
        error
      );
    }
  }

  getBaseUrl(): string {

    return BASE_URL;
  }
}

/* =====================================================
   🚀 EXPORTS
===================================================== */

export const financialOrchestrator =
  new FinancialOrchestratorClient();

export const analyzeFinancialState =
  (
    request:
      CommitmentLockRequest
  ) =>
    financialOrchestrator
      .analyzeFinancialState(
        request
      );

export const runSimulation =
  (
    simulation:
      FinancialSimulation,

    base?: Partial<
      CommitmentLockRequest
    >
  ) =>
    financialOrchestrator
      .runSimulation(
        simulation,
        base
      );

export const runScenarioComparison =
  (
    scenarios:
      CommitmentLockRequest[]
  ) =>
    financialOrchestrator
      .runScenarioComparison(
        scenarios
      );

export const checkBackendHealth =
  () =>
    financialOrchestrator
      .healthCheck();

export const getSystemInfo =
  () =>
    financialOrchestrator
      .getSystemInfo();

export const getFinancialApiBaseUrl =
  () =>
    financialOrchestrator
      .getBaseUrl();