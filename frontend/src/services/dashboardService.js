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
};

export default dashboardService;

