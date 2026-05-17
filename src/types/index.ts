export type AnalysisStatus = "Received" | "Processing" | "Analyzed" | "Completed" | "Error" | "Failed";

export interface DiagramUpload {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileHash: string;
  storagePath: string;
  status: AnalysisStatus;
  createdAt: string;
  userId?: string;
}

export interface UploadResponse {
  diagramId: string;
  fileName: string;
  fileHash: string;
  storagePath: string;
  createdAt: string;
  isDuplicate?: boolean;
}

export interface SagaStatus {
  correlationId: string;
  analysisId: string;
  diagramId: string;
  currentState: string;
  fileName?: string;
  retryCount: number;
  errorMessage?: string;
  reportId?: string;
  processingTimeMs?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentDto {
  name: string;
  type: string;
  description: string;
  confidence: number;
}

export interface ConnectionDto {
  source: string;
  target: string;
  type: string;
  description: string;
}

export interface RiskDto {
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  mitigation: string;
}

export interface ScoresDto {
  scalability: number;
  security: number;
  reliability: number;
  maintainability: number;
}

export interface ReportResponse {
  id: string;
  analysisId: string;
  diagramId: string;
  components: ComponentDto[];
  connections: ConnectionDto[];
  risks: RiskDto[];
  recommendations: string[];
  scores: ScoresDto;
  overallScore: number;
  confidence: number;
  providersUsed: string[];
  processingTimeMs: number;
  createdAt: string;
}

export interface ReportSummary {
  id: string;
  analysisId: string;
  diagramId: string;
  overallScore: number;
  confidence: number;
  componentCount: number;
  riskCount: number;
  createdAt: string;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface StatusChangedPayload {
  analysisId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
}

export interface RecentAnalysis {
  analysisId: string;
  diagramId: string;
  currentState: string;
  fileName?: string;
  processingTimeMs?: number;
  createdAt: string;
}

export interface OrchestratorMetrics {
  totalAnalyses: number;
  completed: number;
  failed: number;
  processing: number;
  averageProcessingTimeMs: number;
  analysesByState: Record<string, number>;
  recentAnalyses: RecentAnalysis[];
}

export interface ScoreAverages {
  scalability: number;
  security: number;
  reliability: number;
  maintainability: number;
}

export interface ReportMetrics {
  totalReports: number;
  averageOverallScore: number;
  providerUsage: Record<string, number>;
  averageScores: ScoreAverages;
}
