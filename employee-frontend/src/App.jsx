
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import "./App.css";

const API = "http://localhost:8081/api";
const PAGE_SIZE = 5;
const CHART_COLORS = [
  "#4f46e5",
  "#0891b2",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  department: "",
  salary: "",
};

function readTokenPayload(token) {
  try {
    const part = token.split(".")[1];
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch {
    return {};
  }
}

function getRole(payload) {
  const value =
    payload.role ??
    payload.roles ??
    payload.authorities ??
    payload.authority ??
    "";

  const roles = Array.isArray(value) ? value : [value];

  return roles
    .map((item) =>
      typeof item === "object" ? item.authority ?? item.name ?? "" : item
    )
    .join(" ")
    .toUpperCase();
}

async function apiRequest(path, token, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "string"
        ? data
        : data?.message ?? data?.error ?? `Request failed (${response.status})`;

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function Icon({ name }) {
  const paths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.6-1.4-2.4L7.1 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
  };

  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("jwtToken") || ""
  );
  const [activePage, setActivePage] = useState("Dashboard");
  const [isRegister, setIsRegister] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeMessage, setEmployeeMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ ...EMPTY_FORM });

  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const payload = useMemo(
    () => (token ? readTokenPayload(token) : {}),
    [token]
  );

  const role = getRole(payload);
  const isAdmin = role.includes("ADMIN");
  const displayUsername = payload.sub ?? username ?? "User";

  const logout = useCallback((message = "") => {
    localStorage.removeItem("jwtToken");
    setToken("");
    setEmployees([]);
    setPassword("");
    setActivePage("Dashboard");
    setAuthMessage(message);
    setEmployeeMessage("");
    setFormOpen(false);
    setEditingId(null);
  }, []);

  const loadEmployees = useCallback(async () => {
    if (!token) return;

    setLoadingEmployees(true);
    setEmployeeMessage("");

    try {
      const result = await apiRequest("/employees", token);
      setEmployees(Array.isArray(result) ? result : []);
    } catch (error) {
      if (error.status === 401) {
        logout("Session expired. Please log in again.");
      } else if (error.status === 403) {
        setEmployeeMessage("You do not have permission to view employees.");
      } else {
        setEmployeeMessage(error.message || "Could not load employees.");
      }
    } finally {
      setLoadingEmployees(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (token) loadEmployees();
  }, [token, loadEmployees]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDepartment]);

  const departmentOptions = useMemo(
    () =>
      [...new Set(employees.map((e) => e.department).filter(Boolean))].sort(),
    [employees]
  );

  const departmentStats = useMemo(() => {
    return departmentOptions.map((department) => {
      const members = employees.filter(
        (employee) => employee.department === department
      );

      return {
        name: department,
        employees: members.length,
        salary: members.reduce(
          (sum, employee) => sum + (Number(employee.salary) || 0),
          0
        ),
      };
    });
  }, [employees, departmentOptions]);

  const totalSalary = useMemo(
    () =>
      employees.reduce(
        (sum, employee) => sum + (Number(employee.salary) || 0),
        0
      ),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return employees.filter((employee) => {
      const values = [
        employee.id,
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.department,
      ];

      const matchesSearch = values.some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );

      const matchesDepartment =
        selectedDepartment === "All" ||
        employee.department === selectedDepartment;

      return matchesSearch && matchesDepartment;
    });
  }, [employees, searchTerm, selectedDepartment]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / PAGE_SIZE)
  );

  const paginatedEmployees = filteredEmployees.slice(
    (Math.min(currentPage, totalPages) - 1) * PAGE_SIZE,
    Math.min(currentPage, totalPages) * PAGE_SIZE
  );

  async function handleAuth(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");

    try {
      const path = isRegister ? "/auth/register" : "/auth/login";
      const body = isRegister
        ? { username, email, password }
        : { username, password };

      const result = await apiRequest(path, "", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (isRegister) {
        setIsRegister(false);
        setPassword("");
        setAuthMessage("Registration successful. Please log in.");
      } else {
        const receivedToken =
          typeof result === "string"
            ? result
            : result?.token ?? result?.jwtToken ?? result?.accessToken;

        if (!receivedToken) {
          throw new Error(
            "Login response did not contain a token. Check your backend response format."
          );
        }

        localStorage.setItem("jwtToken", receivedToken);
        setToken(receivedToken);
        setAuthMessage("");
        setActivePage("Dashboard");
      }
    } catch (error) {
      setAuthMessage(error.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  function openAddForm() {
    setEditingId(null);
    setEmployeeForm({ ...EMPTY_FORM });
    setFormOpen(true);
    setEmployeeMessage("");
  }

  function openEditForm(employee) {
    setEditingId(employee.id);
    setEmployeeForm({
      firstName: employee.firstName ?? "",
      lastName: employee.lastName ?? "",
      email: employee.email ?? "",
      department: employee.department ?? "",
      salary: employee.salary ?? "",
    });
    setFormOpen(true);
    setEmployeeMessage("");
  }

  async function saveEmployee(event) {
    event.preventDefault();

    if (!isAdmin) {
      setEmployeeMessage("Only administrators can add or edit employees.");
      return;
    }

    if (
      !employeeForm.firstName.trim() ||
      !employeeForm.lastName.trim() ||
      !employeeForm.email.trim() ||
      !employeeForm.department.trim()
    ) {
      setEmployeeMessage("Please complete all employee fields.");
      return;
    }

    const salary = Number(employeeForm.salary);

    if (!Number.isFinite(salary) || salary < 0) {
      setEmployeeMessage("Enter a valid non-negative salary.");
      return;
    }

    setSavingEmployee(true);
    setEmployeeMessage("");

    const body = {
      ...employeeForm,
      firstName: employeeForm.firstName.trim(),
      lastName: employeeForm.lastName.trim(),
      email: employeeForm.email.trim(),
      department: employeeForm.department.trim(),
      salary,
    };

    try {
      await apiRequest(
        editingId !== null ? `/employees/${editingId}` : "/employees",
        token,
        {
          method: editingId !== null ? "PUT" : "POST",
          body: JSON.stringify(body),
        }
      );

      setFormOpen(false);
      setEditingId(null);
      setEmployeeForm({ ...EMPTY_FORM });
      await loadEmployees();
      setEmployeeMessage(
        editingId !== null
          ? "Employee updated successfully."
          : "Employee added successfully."
      );
    } catch (error) {
      if (error.status === 401) {
        logout("Session expired. Please log in again.");
      } else {
        setEmployeeMessage(error.message || "Could not save employee.");
      }
    } finally {
      setSavingEmployee(false);
    }
  }

  async function deleteEmployee(id) {
    if (!isAdmin) {
      setEmployeeMessage("Only administrators can delete employees.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this employee?")) {
      return;
    }

    setEmployeeMessage("");

    try {
      await apiRequest(`/employees/${id}`, token, { method: "DELETE" });
      await loadEmployees();
      setEmployeeMessage("Employee deleted successfully.");
    } catch (error) {
      if (error.status === 401) {
        logout("Session expired. Please log in again.");
      } else {
        setEmployeeMessage(error.message || "Could not delete employee.");
      }
    }
  }

  async function changeUsername(event) {
    event.preventDefault();
    setAccountMessage("");

    if (!newUsername.trim()) {
      setAccountMessage("Enter a new username.");
      return;
    }

    setAccountLoading(true);

    try {
      await apiRequest("/auth/change-username", token, {
        method: "PUT",
        body: JSON.stringify({ newUsername: newUsername.trim() }),
      });

      logout("Username updated. Please log in with your new username.");
      setAccountMessage(
        "Username updated. Please log in with your new username."
      );
    } catch (error) {
      setAccountMessage(error.message || "Could not change username.");
    } finally {
      setAccountLoading(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setAccountMessage("");

    if (newPassword.length < 8) {
      setAccountMessage("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setAccountMessage("New password and confirmation do not match.");
      return;
    }

    setAccountLoading(true);

    try {
      await apiRequest("/auth/change-password", token, {
        method: "PUT",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      logout("Password updated. Please log in again.");
      setAccountMessage("Password updated. Please log in again.");
    } catch (error) {
      setAccountMessage(error.message || "Could not change password.");
    } finally {
      setAccountLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">EM</div>
          <p className="eyebrow">EMPLOYEE MANAGEMENT</p>
          <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p className="muted">
            {isRegister
              ? "Register to get started."
              : "Log in to manage your workspace."}
          </p>

          {authMessage && (
            <div className="notice" role="status">
              {authMessage}
            </div>
          )}

          <form className="form-stack" onSubmit={handleAuth}>
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="Enter username"
              />
            </label>

            {isRegister && (
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
            )}

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder="Enter password"
              />
            </label>

            <button className="btn btn-primary btn-full" disabled={authLoading}>
              {authLoading
                ? "Please wait..."
                : isRegister
                  ? "Create account"
                  : "Log in"}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? "Already registered?" : "Don't have an account?"}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setIsRegister(!isRegister);
                setAuthMessage("");
              }}
            >
              {isRegister ? "Log in" : "Register"}
            </button>
          </p>

          {isRegister && (
            <p className="small-note">
              New registrations receive the role assigned by your backend.
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">EM</div>
          <div>
            <strong>EmployeeHub</strong>
            <span>Management Portal</span>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <nav className="side-nav">
          <button
            className={`nav-item ${activePage === "Dashboard" ? "active" : ""}`}
            onClick={() => setActivePage("Dashboard")}
          >
            <Icon name="dashboard" />
            Dashboard
          </button>

          <button
            className={`nav-item ${activePage === "Employees" ? "active" : ""}`}
            onClick={() => setActivePage("Employees")}
          >
            <Icon name="users" />
            Employees
          </button>

          <button
            className={`nav-item ${activePage === "Settings" ? "active" : ""}`}
            onClick={() => setActivePage("Settings")}
          >
            <Icon name="settings" />
            Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="profile-mini">
            <div className="avatar">
              {String(displayUsername).charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <strong>{displayUsername}</strong>
              <span>{isAdmin ? "Administrator" : "Employee"}</span>
            </div>
          </div>

          <button className="nav-item logout-item" onClick={() => logout()}>
            <Icon name="logout" />
            Log out
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">WORKSPACE / {activePage.toUpperCase()}</p>
            <h1>{activePage}</h1>
          </div>

          <div className="topbar-right">
            <span className="status-dot" />
            <span>Signed in as {displayUsername}</span>
          </div>
        </header>

        <div className="page-content">
          {activePage === "Dashboard" && (
            <>
              <section className="welcome-banner">
                <div>
                  <p className="eyebrow light-eyebrow">YOUR WORKSPACE</p>
                  <h2>Welcome back, {displayUsername}!</h2>
                  <p>
                    Here is an overview of your employee management workspace.
                  </p>
                </div>
                <div className="welcome-decoration">✦</div>
              </section>

              <section className="stats-grid">
                <article className="stat-card">
                  <div className="stat-icon purple">
                    <Icon name="users" />
                  </div>
                  <p>Total Employees</p>
                  <strong>{employees.length}</strong>
                  <span>Employee records</span>
                </article>

                <article className="stat-card">
                  <div className="stat-icon cyan">
                    <Icon name="dashboard" />
                  </div>
                  <p>Departments</p>
                  <strong>{departmentOptions.length}</strong>
                  <span>Unique departments</span>
                </article>

                <article className="stat-card">
                  <div className="stat-icon green">₹</div>
                  <p>Total Monthly Salary</p>
                  <strong className="salary-stat">{money(totalSalary)}</strong>
                  <span>Combined listed salaries</span>
                </article>

                <article className="stat-card">
                  <div className="stat-icon amber">
                    <Icon name="settings" />
                  </div>
                  <p>Your Access</p>
                  <strong className="access-stat">
                    {isAdmin ? "Admin" : "Employee"}
                  </strong>
                  <span>{isAdmin ? "Management access" : "Standard access"}</span>
                </article>
              </section>

              <section className="charts-grid">
                <article className="panel chart-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Employees by Department</h3>
                      <p>Distribution across departments</p>
                    </div>
                  </div>

                  {departmentStats.length === 0 ? (
                    <div className="chart-empty">
                      {loadingEmployees
                        ? "Loading employee data..."
                        : "No department data available yet."}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={290}>
                      <PieChart>
                        <Pie
                          data={departmentStats}
                          dataKey="employees"
                          nameKey="name"
                          cx="50%"
                          cy="48%"
                          outerRadius={88}
                          paddingAngle={3}
                        >
                          {departmentStats.map((item, index) => (
                            <Cell
                              key={item.name}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </article>

                <article className="panel chart-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Salary by Department</h3>
                      <p>Combined monthly salary</p>
                    </div>
                  </div>

                  {departmentStats.length === 0 ? (
                    <div className="chart-empty">No salary data available.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={290}>
                      <BarChart
                        data={departmentStats}
                        margin={{ top: 12, right: 12, left: 4, bottom: 10 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) =>
                            value >= 1000
                              ? `${Math.round(value / 1000)}k`
                              : value
                          }
                        />
                        <Tooltip
                          formatter={(value) => [money(value), "Salary"]}
                        />
                        <Bar
                          dataKey="salary"
                          name="Monthly Salary"
                          fill="#4f46e5"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={48}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </article>
              </section>

              <section className="panel records-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Employee Records</h3>
                    <p>Quick access to employee information</p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={loadEmployees}
                    disabled={loadingEmployees}
                  >
                    {loadingEmployees ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {employeeMessage && (
                  <div className="notice" role="status">
                    {employeeMessage}
                  </div>
                )}

                <div className="record-summary">
                  <div>
                    <span className="summary-number">{employees.length}</span>
                    <span className="summary-label">Employee records</span>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => setActivePage("Employees")}
                  >
                    View employees →
                  </button>
                </div>
              </section>
            </>
          )}

          {activePage === "Employees" && (
            <section className="panel employees-panel">
              <div className="panel-heading employees-heading">
                <div>
                  <h3>Employee Directory</h3>
                  <p>Search and manage employee records.</p>
                </div>

                <div className="heading-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={loadEmployees}
                    disabled={loadingEmployees}
                  >
                    {loadingEmployees ? "Refreshing..." : "Refresh"}
                  </button>

                  {isAdmin && (
                    <button className="btn btn-primary" onClick={openAddForm}>
                      + Add Employee
                    </button>
                  )}
                </div>
              </div>

              {employeeMessage && (
                <div className="notice" role="status">
                  {employeeMessage}
                </div>
              )}

              {formOpen && isAdmin && (
                <form className="employee-form" onSubmit={saveEmployee}>
                  <div className="form-title-row">
                    <h3>
                      {editingId !== null ? "Edit Employee" : "Add Employee"}
                    </h3>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setFormOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="employee-form-grid">
                    <label>
                      First name
                      <input
                        value={employeeForm.firstName}
                        onChange={(e) =>
                          setEmployeeForm({
                            ...employeeForm,
                            firstName: e.target.value,
                          })
                        }
                        required
                      />
                    </label>

                    <label>
                      Last name
                      <input
                        value={employeeForm.lastName}
                        onChange={(e) =>
                          setEmployeeForm({
                            ...employeeForm,
                            lastName: e.target.value,
                          })
                        }
                        required
                      />
                    </label>

                    <label>
                      Email
                      <input
                        type="email"
                        value={employeeForm.email}
                        onChange={(e) =>
                          setEmployeeForm({
                            ...employeeForm,
                            email: e.target.value,
                          })
                        }
                        required
                      />
                    </label>

                    <label>
                      Department
                      <input
                        value={employeeForm.department}
                        onChange={(e) =>
                          setEmployeeForm({
                            ...employeeForm,
                            department: e.target.value,
                          })
                        }
                        required
                        placeholder="e.g. IT"
                      />
                    </label>

                    <label>
                      Monthly salary (₹)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={employeeForm.salary}
                        onChange={(e) =>
                          setEmployeeForm({
                            ...employeeForm,
                            salary: e.target.value,
                          })
                        }
                        required
                      />
                    </label>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setFormOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={savingEmployee}
                    >
                      {savingEmployee
                        ? "Saving..."
                        : editingId !== null
                          ? "Save changes"
                          : "Add employee"}
                    </button>
                  </div>
                </form>
              )}

              <div className="employee-filters">
                <div className="search-box">
                  <Icon name="search" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, email, department..."
                    aria-label="Search employees"
                  />
                </div>

                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="department-filter"
                  aria-label="Filter by department"
                >
                  <option value="All">All departments</option>
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="table-wrapper">
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Employee</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Monthly Salary</th>
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {loadingEmployees && employees.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 5} className="empty-cell">
                          Loading employees...
                        </td>
                      </tr>
                    ) : paginatedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 5} className="empty-cell">
                          No employees match your search.
                        </td>
                      </tr>
                    ) : (
                      paginatedEmployees.map((employee) => (
                        <tr key={employee.id}>
                          <td>#{employee.id}</td>
                          <td>
                            <div className="employee-name-cell">
                              <div className="avatar small-avatar">
                                {String(employee.firstName ?? "?")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <strong>
                                {employee.firstName} {employee.lastName}
                              </strong>
                            </div>
                          </td>
                          <td>{employee.email}</td>
                          <td>
                            <span className="department-badge">
                              {employee.department || "Unassigned"}
                            </span>
                          </td>
                          <td className="salary-cell">
                            {money(employee.salary)}
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="row-actions">
                                <button
                                  className="action-edit"
                                  onClick={() => openEditForm(employee)}
                                  aria-label={`Edit ${employee.firstName}`}
                                >
                                  Edit
                                </button>
                                <button
                                  className="action-delete"
                                  onClick={() => deleteEmployee(employee.id)}
                                  aria-label={`Delete ${employee.firstName}`}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <span>
                  Showing{" "}
                  {filteredEmployees.length === 0
                    ? 0
                    : (Math.min(currentPage, totalPages) - 1) * PAGE_SIZE + 1}
                  {"–"}
                  {Math.min(
                    Math.min(currentPage, totalPages) * PAGE_SIZE,
                    filteredEmployees.length
                  )}{" "}
                  of {filteredEmployees.length} employees
                </span>

                <div className="pagination-buttons">
                  <button
                    className="btn btn-secondary"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    Previous
                  </button>
                  <span>
                    Page {Math.min(currentPage, totalPages)} of {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          )}

          {activePage === "Settings" && (
            <section className="settings-layout">
              <article className="panel account-panel">
                <div className="settings-profile">
                  <div className="avatar large-avatar">
                    {String(displayUsername).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3>{displayUsername}</h3>
                    <p>{isAdmin ? "Administrator" : "Employee"} account</p>
                    <span className="account-status">
                      <span className="status-dot" /> Active session
                    </span>
                  </div>
                </div>

                <div className="account-details">
                  <div>
                    <span>Username</span>
                    <strong>{displayUsername}</strong>
                  </div>
                  <div>
                    <span>Role</span>
                    <strong>{isAdmin ? "ADMIN" : "EMPLOYEE"}</strong>
                  </div>
                  <div>
                    <span>Permissions</span>
                    <strong>
                      {isAdmin ? "Manage employees" : "View employees"}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="panel security-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Account Security</h3>
                    <p>Manage your login credentials.</p>
                  </div>
                </div>

                {accountMessage && (
                  <div className="notice" role="status">
                    {accountMessage}
                  </div>
                )}

                <div className="security-option">
                  <div>
                    <strong>Change username</strong>
                    <p>Update the username used to log in.</p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowUsernameForm(!showUsernameForm);
                      setShowPasswordForm(false);
                      setAccountMessage("");
                    }}
                  >
                    {showUsernameForm ? "Cancel" : "Change"}
                  </button>
                </div>

                {showUsernameForm && (
                  <form className="form-stack settings-form" onSubmit={changeUsername}>
                    <label>
                      New username
                      <input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        required
                      />
                    </label>
                    <button
                      className="btn btn-primary"
                      disabled={accountLoading}
                    >
                      {accountLoading ? "Updating..." : "Update username"}
                    </button>
                  </form>
                )}

                <div className="security-option">
                  <div>
                    <strong>Change password</strong>
                    <p>Use a strong password with at least 8 characters.</p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowPasswordForm(!showPasswordForm);
                      setShowUsernameForm(false);
                      setAccountMessage("");
                    }}
                  >
                    {showPasswordForm ? "Cancel" : "Change"}
                  </button>
                </div>

                {showPasswordForm && (
                  <form className="form-stack settings-form" onSubmit={changePassword}>
                    <label>
                      Current password
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                    </label>
                    <label>
                      New password
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                        autoComplete="new-password"
                      />
                    </label>
                    <label>
                      Confirm new password
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        autoComplete="new-password"
                      />
                    </label>
                    <button
                      className="btn btn-primary"
                      disabled={accountLoading}
                    >
                      {accountLoading ? "Updating..." : "Update password"}
                    </button>
                  </form>
                )}

                <div className="security-option signout-option">
                  <div>
                    <strong>Sign out</strong>
                    <p>End your current session on this device.</p>
                  </div>
                  <button className="btn btn-danger" onClick={() => logout()}>
                    Log out
                  </button>
                </div>
              </article>
            </section>
          )}
        </div>

        <footer className="app-footer">
          <span>EmployeeHub</span>
          <span>Employee Management Portal</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
