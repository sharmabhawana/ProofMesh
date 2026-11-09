import api from "./api";

export const dashboardService = {
  /**
   * Fetch complete Neo4j workflow provenance graph
   */
  async getWorkflowGraph() {
    const response = await api.get("/api/workflow-graph");
    return response.data;
  },

  /**
   * Fetch SHA-256 integrity verification status
   */
  async getIntegrityStatus() {
    const response = await api.get("/api/integrity-status");
    return response.data;
  },

  /**
   * Fetch ProofMesh rule-based trust assessment
   */
  async getTrustScore() {
    const response = await api.get("/api/trust-score");
    return response.data;
  },

  /**
   * Perform dependency-based impact analysis
   * @param {Object} params
   * @param {string} params.node_type - "Agent" | "Tool" | "DataSource" | "Decision"
   * @param {string} params.node_id - node identifier
   * @param {boolean} [params.unreliable=false] - simulation flag
   * @param {boolean} [params.check_integrity=false] - verify chain during analysis
   */
  async getImpactAnalysis({
    node_type = "DataSource",
    node_id = "controlled_proofmesh_knowledge_base",
    unreliable = false,
    check_integrity = true,
  } = {}) {
    const response = await api.get("/api/impact-analysis", {
      params: {
        node_type,
        node_id,
        unreliable,
        check_integrity,
      },
    });
    return response.data;
  },

  /**
   * Fetch FastAPI backend health status
   */
  async getHealth() {
    const response = await api.get("/health");
    return response.data;
  },

  /**
   * Fetch root API home info
   */
  async getHome() {
    const response = await api.get("/");
    return response.data;
  },

  /**
   * Fetch user list for admin
   */
  async getAdminUsers() {
    const response = await api.get("/api/auth/admin/users");
    return response.data;
  },

  /**
   * Toggle user active state
   */
  async updateUserStatus(userId, isActive) {
    const response = await api.patch(`/api/auth/admin/users/${userId}/status`, {
      is_active: isActive,
    });
    return response.data;
  },

  /**
   * Execute real AI agent workflow
   */
  async runWorkflow({ workflow_name, task_description, model_name = "gemini-3.5-flash-lite" }) {
    const response = await api.post("/api/workflows/run", {
      workflow_name,
      task_description,
      model_name,
    });
    return response.data;
  },

  /**
   * Fetch all user workflows
   */
  async getWorkflows() {
    const response = await api.get("/api/workflows");
    return response.data;
  },

  /**
   * Fetch specific workflow details
   */
  async getWorkflowDetails(workflowId) {
    const response = await api.get(`/api/workflows/${workflowId}`);
    return response.data;
  },

  /**
   * Upload external agent execution log
   */
  async uploadAgentData(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/uploads", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  /**
   * Fetch all user uploads
   */
  async getUploads() {
    const response = await api.get("/api/uploads");
    return response.data;
  },

  /**
   * Fetch upload details
   */
  async getUploadDetails(uploadId) {
    const response = await api.get(`/api/uploads/${uploadId}`);
    return response.data;
  },

  /**
   * Fetch parsed events for upload
   */
  async getUploadEvents(uploadId) {
    const response = await api.get(`/api/uploads/${uploadId}/events`);
    return response.data;
  },

  /**
   * Fetch analysis metrics for upload
   */
  async getUploadAnalysis(uploadId) {
    const response = await api.get(`/api/uploads/${uploadId}/analysis`);
    return response.data;
  },

  /**
   * Fetch React Flow graph for upload
   */
  async getUploadGraph(uploadId) {
    const response = await api.get(`/api/uploads/${uploadId}/graph`);
    return response.data;
  },

  /**
   * Verify upload cryptographic snapshot integrity
   */
  async getUploadIntegrity(uploadId) {
    const response = await api.get(`/api/uploads/${uploadId}/integrity`);
    return response.data;
  },

  /**
   * Fetch all generated reports
   */
  async getReports() {
    const response = await api.get("/api/reports");
    return response.data;
  },

  /**
   * Download a specific report
   */
  async downloadReport(reportId, filename = "report.json") {
    const response = await api.get(`/api/reports/${reportId}/download`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  /**
   * Dataset Engine APIs: Profiles, Generation, Validation, and Benchmarks
   */
  async getDatasetProfiles() {
    const response = await api.get("/api/datasets/profiles");
    return response.data;
  },

  async generateDataset(data) {
    const response = await api.post("/api/datasets/generate", data);
    return response.data;
  },

  async validateDataset(data) {
    const response = await api.post("/api/datasets/validate", data);
    return response.data;
  },

  async getDatasetBenchmarks() {
    const response = await api.get("/api/datasets/benchmarks");
    return response.data;
  },
};

export default dashboardService;

