import { useState, useEffect, useCallback } from "react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Overview from "./pages/Overview";
import WorkflowExplorer from "./pages/WorkflowExplorer";
import IntegrityCenter from "./pages/IntegrityCenter";
import TrustAnalytics from "./pages/TrustAnalytics";
import ImpactAnalysis from "./pages/ImpactAnalysis";
import DataSources from "./pages/DataSources";
import SystemHealth from "./pages/SystemHealth";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import CreateWorkflow from "./pages/CreateWorkflow";
import WorkflowHistory from "./pages/WorkflowHistory";
import UploadCenter from "./pages/UploadCenter";
import Reports from "./pages/Reports";
import AgentDataExplorer from "./pages/AgentDataExplorer";
import LoadingState from "./components/LoadingState";
import dashboardService from "./services/dashboardService";
import "./App.css";

function MainDashboard() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Authentication view switcher (when unauthenticated)
  const [authView, setAuthView] = useState("login"); // "login" | "register"

  // Active page state with hash support
  const [activePage, setActivePage] = useState(() => {
    const hash = window.location.hash.replace("#/", "").replace("#", "");
    const validPages = [
      "overview",
      "workflow",
      "integrity",
      "trust",
      "impact",
      "sources",
      "health",
      "settings",
      "admin",
      "create-workflow",
      "history",
      "upload",
      "reports",
      "agent-explorer",
    ];
    return validPages.includes(hash) ? hash : "overview";
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [impactPreset, setImpactPreset] = useState(null);

  // Core backend data states
  const [dashboardData, setDashboardData] = useState({
    trust: null,
    integrity: null,
    workflow: null,
    impact: null,
    health: null,
  });

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [backendConnected, setBackendConnected] = useState(true);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#/", "").replace("#", "");
      if (hash) setActivePage(hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleNavigate = (pageId) => {
    setActivePage(pageId);
    window.location.hash = `#/${pageId}`;
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToImpactWithPreset = (preset) => {
    setImpactPreset(preset);
    handleNavigate("impact");
  };

  // Fetch all backend telemetry
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    const failed = [];
    const updated = {};

    try {
      const [trustRes, integRes, workflowRes, healthRes] =
        await Promise.allSettled([
          dashboardService.getTrustScore(),
          dashboardService.getIntegrityStatus(),
          dashboardService.getWorkflowGraph(),
          dashboardService.getHealth(),
        ]);

      if (trustRes.status === "fulfilled") updated.trust = trustRes.value;
      else failed.push("Trust score");

      if (integRes.status === "fulfilled") updated.integrity = integRes.value;
      else failed.push("Integrity status");

      if (workflowRes.status === "fulfilled")
        updated.workflow = workflowRes.value;
      else failed.push("Workflow graph");

      if (healthRes.status === "fulfilled") updated.health = healthRes.value;
      else failed.push("System health");

      // Attempt default impact analysis
      try {
        const impactRes = await dashboardService.getImpactAnalysis({
          node_type: "DataSource",
          node_id: "controlled_proofmesh_knowledge_base",
          unreliable: false,
          check_integrity: true,
        });
        updated.impact = impactRes;
      } catch (err) {
        failed.push("Impact analysis");
      }

      setDashboardData((prev) => ({ ...prev, ...updated }));
      setErrors(failed);
      setBackendConnected(failed.length < 4);
    } catch (globalErr) {
      console.error("Dashboard fetch error:", globalErr);
      setBackendConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated, fetchAllData]);

  // Loading initial authentication state
  if (authLoading) {
    return (
      <div
        className="app-shell"
        data-theme={theme}
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--bg)",
        }}
      >
        <LoadingState message="Initializing ProofMesh Security Context..." />
      </div>
    );
  }

  // If unauthenticated, show professional Login or Register view
  if (!isAuthenticated) {
    return (
      <div
        className="app-shell auth-shell"
        data-theme={theme}
        style={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        {authView === "login" ? (
          <Login
            onSwitchToRegister={() => setAuthView("register")}
            onLoginSuccess={(target) => handleNavigate(target || "overview")}
          />
        ) : (
          <Register onSwitchToLogin={() => setAuthView("login")} />
        )}
      </div>
    );
  }

  // Render Page Content based on activePage
  const renderActivePage = () => {
    switch (activePage) {
      case "overview":
        return (
          <Overview
            dashboardData={dashboardData}
            isLoading={loading}
            error={errors.length > 0 ? `Failed components: ${errors.join(", ")}` : null}
            onRefresh={fetchAllData}
            onNavigate={handleNavigate}
          />
        );

      case "workflow":
        return (
          <WorkflowExplorer
            workflowData={dashboardData.workflow}
            isLoading={loading}
            error={errors.includes("Workflow graph") ? "Workflow graph API offline." : null}
            onRefresh={fetchAllData}
            onNavigateToImpact={navigateToImpactWithPreset}
          />
        );

      case "integrity":
        return (
          <IntegrityCenter
            integrityData={dashboardData.integrity}
            isLoading={loading}
            error={errors.includes("Integrity status") ? "Integrity endpoint error." : null}
            onRefresh={fetchAllData}
          />
        );

      case "trust":
        return (
          <TrustAnalytics
            trustData={dashboardData.trust}
            isLoading={loading}
            error={errors.includes("Trust score") ? "Trust scoring engine error." : null}
            onRefresh={fetchAllData}
          />
        );

      case "impact":
        return (
          <ImpactAnalysis
            workflowData={dashboardData.workflow}
            initialSelection={impactPreset}
          />
        );

      case "sources":
        return (
          <DataSources
            workflowData={dashboardData.workflow}
            integrityData={dashboardData.integrity}
            isLoading={loading}
            error={errors.includes("Workflow graph") ? "Data sources unavailable." : null}
            onRefresh={fetchAllData}
          />
        );

      case "health":
        return (
          <SystemHealth
            healthData={dashboardData.health}
            workflowData={dashboardData.workflow}
            integrityData={dashboardData.integrity}
            onRefresh={fetchAllData}
          />
        );

      case "settings":
        return <Settings />;

      case "admin":
        return <AdminDashboard />;

      case "create-workflow":
        return (
          <CreateWorkflow
            onNavigate={handleNavigate}
            onWorkflowComplete={() => handleNavigate("history")}
          />
        );

      case "history":
        return <WorkflowHistory onNavigate={handleNavigate} />;

      case "upload":
        return <UploadCenter onNavigate={handleNavigate} />;

      case "reports":
        return <Reports onNavigate={handleNavigate} />;

      case "agent-explorer":
        return <AgentDataExplorer onNavigate={handleNavigate} />;

      default:
        return (
          <Overview
            dashboardData={dashboardData}
            isLoading={loading}
            onRefresh={fetchAllData}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div className="app-shell" data-theme={theme}>
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        backendConnected={backendConnected}
      />

      {/* Main Content Area */}
      <main className="main-area">
        <Topbar
          activePage={activePage}
          onOpenSidebar={() => setSidebarOpen(true)}
          onRefresh={fetchAllData}
          isLoading={loading}
          backendConnected={backendConnected}
        />

        <div className="page-content" style={{ padding: "28px 32px 48px" }}>
          {renderActivePage()}

          {/* Footer */}
          <footer
            className="app-footer"
            style={{
              marginTop: "56px",
              paddingTop: "24px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              fontSize: "12px",
              color: "var(--subtle)",
            }}
          >
            <span>ProofMesh · Cryptographically Verifiable AI Agent Provenance Framework</span>
            <span>Enterprise Security Dashboard · 2026</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainDashboard />
      </AuthProvider>
    </ThemeProvider>
  );
}
