import api from "./api";

export const authService = {
  /**
   * Log in user using OAuth2 password flow format
   * @param {string} email - user's email address (passed as username parameter)
   * @param {string} password - plain password
   */
  async login(email, password) {
    const params = new URLSearchParams();
    params.append("username", email.trim().toLowerCase());
    params.append("password", password);

    const response = await api.post("/api/auth/login", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const { access_token, user } = response.data;
    if (access_token) {
      localStorage.setItem("proofmesh_token", access_token);
      if (user) {
        localStorage.setItem("proofmesh_user", JSON.stringify(user));
      }
    }
    return response.data;
  },

  /**
   * Register a new user account
   * @param {string} username
   * @param {string} email
   * @param {string} password
   * @param {string} [fullName]
   */
  async register(username, email, password, fullName = null) {
    const response = await api.post("/api/auth/register", {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      full_name: fullName ? fullName.trim() : null,
    });
    return response.data;
  },

  /**
   * Fetch current user profile with token
   */
  async getProfile() {
    const response = await api.get("/api/auth/me");
    if (response.data) {
      localStorage.setItem("proofmesh_user", JSON.stringify(response.data));
    }
    return response.data;
  },

  /**
   * Logout user and purge local credentials
   */
  logout() {
    localStorage.removeItem("proofmesh_token");
    localStorage.removeItem("proofmesh_user");
    window.dispatchEvent(new CustomEvent("proofmesh-auth-change"));
  },

  getToken() {
    return localStorage.getItem("proofmesh_token");
  },

  getUser() {
    const raw = localStorage.getItem("proofmesh_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem("proofmesh_token");
  },
};

export default authService;

