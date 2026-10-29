import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { api } from "../api";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    total_documents: 0,
    total_chats: 0,
    open_tickets: 0,
    resolved_tickets: 0,
  });
  const [recentChats, setRecentChats] = useState([]);
  const [recentUploads, setRecentUploads] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [analytics, setAnalytics] = useState({
    ticket_distribution: {},
    chat_volume_over_time: [],
    document_type_distribution: {},
  });
  const [loading, setLoading] = useState(true);

  // Create-Admin form state
  const [adminForm, setAdminForm] = useState({ full_name: "", email: "", password: "" });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  const fetchDashboardData = async (isBackground = false) => {
    try {
      const data = await api.get("/dashboard");
      setStats(data.stats);
      setRecentChats(data.recent_chats);
      setRecentUploads(data.recent_uploads);

      const analyticData = await api.get("/analytics");
      setAnalytics(analyticData);

      const ticketData = await api.get("/tickets");
      setTickets(ticketData);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-sync every 3 seconds so ticket deletions / status changes reflect in real time
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 3000);

    // Refresh immediately when window gains focus
    const onFocus = () => fetchDashboardData(true);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await api.put(`/tickets/${ticketId}`, { status: newStatus });
      fetchDashboardData();
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    try {
      await api.delete(`/tickets/${ticketId}`);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to delete ticket: " + err.message);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminError("");
    setAdminSuccess("");
    setAdminLoading(true);
    try {
      const newAdmin = await api.post("/admin/create-admin", {
        full_name: adminForm.full_name,
        email: adminForm.email,
        password: adminForm.password,
        role: "admin",
      });
      setAdminSuccess(`✅ Admin account created for ${newAdmin.email}`);
      setAdminForm({ full_name: "", email: "", password: "" });
    } catch (err) {
      setAdminError(err.message || "Failed to create admin account.");
    } finally {
      setAdminLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout pageTitle="Executive Dashboard">
        <div className="flex h-64 items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  // SVG chart helpers
  const chatPoints = analytics.chat_volume_over_time || [];
  const maxCount = Math.max(...chatPoints.map((p) => p.count), 5);
  const chartHeight = 120;
  const chartWidth = 500;

  const pathD = chatPoints.length
    ? chatPoints
        .map((p, idx) => {
          const x = (idx / (chatPoints.length - 1)) * chartWidth;
          const y = chartHeight - (p.count / maxCount) * chartHeight + 10;
          return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ")
    : "";

  return (
    <Layout pageTitle="Executive Dashboard">
      {/* Tab Switcher */}
      <div className="flex border-b border-outline-variant dark:border-outline mb-xl">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-xl py-md font-label-md text-label-md transition-colors cursor-pointer border-b-2 ${
            activeTab === "overview"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Overview Console
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`px-xl py-md font-label-md text-label-md transition-colors cursor-pointer border-b-2 ${
            activeTab === "tickets"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Tickets Console ({tickets.filter((t) => t.status === "Open").length} Open)
        </button>
        <button
          onClick={() => setActiveTab("admin")}
          className={`px-xl py-md font-label-md text-label-md transition-colors cursor-pointer border-b-2 ${
            activeTab === "admin"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Admin Management
        </button>
      </div>

      {/* ── Overview Tab ───────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-xl">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-lg">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm flex items-center justify-between">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Total Documents
                </span>
                <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface mt-xs">
                  {stats.total_documents}
                </h3>
              </div>
              <span className="material-symbols-outlined text-[36px] text-primary bg-primary/10 p-md rounded-xl">
                description
              </span>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm flex items-center justify-between">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Total Conversations
                </span>
                <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface mt-xs">
                  {stats.total_chats}
                </h3>
              </div>
              <span className="material-symbols-outlined text-[36px] text-secondary bg-secondary/10 p-md rounded-xl">
                forum
              </span>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm flex items-center justify-between">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Open Tickets
                </span>
                <h3 className="font-headline-lg text-headline-lg font-bold text-error mt-xs">
                  {stats.open_tickets}
                </h3>
              </div>
              <span className="material-symbols-outlined text-[36px] text-error bg-error/10 p-md rounded-xl">
                confirmation_number
              </span>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm flex items-center justify-between">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Resolved Tickets
                </span>
                <h3 className="font-headline-lg text-headline-lg font-bold text-primary mt-xs">
                  {stats.resolved_tickets}
                </h3>
              </div>
              <span className="material-symbols-outlined text-[36px] text-primary-container bg-primary-container/10 p-md rounded-xl">
                check_circle
              </span>
            </div>
          </div>

          {/* Charts + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
            <div className="lg:col-span-2 space-y-xl">
              {/* Chat Volume Chart */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
                <h4 className="font-headline-md text-headline-md font-bold text-on-surface mb-lg">
                  Conversation Volume (Last 7 Days)
                </h4>
                <div className="h-[180px] w-full flex flex-col justify-between">
                  <div className="flex-1 relative">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`} className="w-full h-full overflow-visible">
                      <line x1="0" y1="10" x2={chartWidth} y2="10" stroke="rgba(0,0,0,0.05)" strokeDasharray="4" />
                      <line x1="0" y1={chartHeight / 2 + 10} x2={chartWidth} y2={chartHeight / 2 + 10} stroke="rgba(0,0,0,0.05)" strokeDasharray="4" />
                      <line x1="0" y1={chartHeight + 10} x2={chartWidth} y2={chartHeight + 10} stroke="rgba(0,0,0,0.1)" />

                      {chatPoints.length > 0 && (
                        <path
                          d={`${pathD} L ${chartWidth} ${chartHeight + 10} L 0 ${chartHeight + 10} Z`}
                          fill="rgba(0, 108, 76, 0.05)"
                        />
                      )}
                      {chatPoints.length > 0 && (
                        <path d={pathD} fill="none" stroke="#006c4c" strokeWidth="2.5" />
                      )}
                      {chatPoints.map((p, idx) => {
                        const x = (idx / (chatPoints.length - 1)) * chartWidth;
                        const y = chartHeight - (p.count / maxCount) * chartHeight + 10;
                        return (
                          <g key={idx}>
                            <circle cx={x} cy={y} r="4" fill="#00a878" stroke="#ffffff" strokeWidth="1.5" />
                            <text x={x} y={y - 8} textAnchor="middle" className="text-[10px] fill-on-surface font-semibold">
                              {p.count}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  <div className="flex justify-between text-label-sm text-on-surface-variant px-sm mt-md">
                    {chatPoints.map((p, idx) => (
                      <span key={idx}>{p.date.split("-").slice(1).join("/")}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Document Distribution */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
                <h4 className="font-headline-md text-headline-md font-bold text-on-surface mb-lg">
                  Document Types Breakdown
                </h4>
                <div className="grid grid-cols-3 gap-md">
                  {Object.entries(analytics.document_type_distribution || {}).map(([type, count]) => (
                    <div key={type} className="p-md bg-surface-container-low rounded-xl text-center">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{type}</span>
                      <p className="font-headline-md text-headline-md font-bold text-primary mt-xs">{count} files</p>
                    </div>
                  ))}
                  {Object.keys(analytics.document_type_distribution || {}).length === 0 && (
                    <div className="col-span-3 text-center py-md text-on-surface-variant font-label-md">
                      No documents cataloged yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-xl">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
                <h4 className="font-headline-md text-headline-md font-bold text-on-surface mb-md">
                  Recent Chat Activity
                </h4>
                <div className="space-y-md max-h-[220px] overflow-y-auto pr-xs">
                  {recentChats.map((c) => (
                    <div key={c.id} className="flex flex-col border-b border-outline-variant/30 pb-sm">
                      <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                        {c.title}
                      </span>
                      <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mt-xs">
                        <span className="truncate">{c.user_email}</span>
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {recentChats.length === 0 && (
                    <p className="text-on-surface-variant font-label-md text-center py-md">
                      No chat activity recorded.
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
                <h4 className="font-headline-md text-headline-md font-bold text-on-surface mb-md">
                  Recent Uploads
                </h4>
                <div className="space-y-md max-h-[220px] overflow-y-auto pr-xs">
                  {recentUploads.map((u) => (
                    <div key={u.id} className="flex justify-between items-center border-b border-outline-variant/30 pb-sm">
                      <div className="truncate pr-sm">
                        <p className="font-label-md text-label-md text-on-surface font-semibold truncate">
                          {u.filename}
                        </p>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span
                        className={`px-sm py-[2px] rounded-full font-label-sm text-label-sm ${
                          u.status === "completed"
                            ? "bg-primary-container/10 text-primary-container"
                            : u.status === "processing"
                            ? "bg-secondary-container/10 text-secondary-container animate-pulse"
                            : "bg-error-container/10 text-error"
                        }`}
                      >
                        {u.status}
                      </span>
                    </div>
                  ))}
                  {recentUploads.length === 0 && (
                    <p className="text-on-surface-variant font-label-md text-center py-md">
                      No documents uploaded yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tickets Tab ────────────────────────────────────────────────── */}
      {activeTab === "tickets" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm overflow-hidden">
          <h4 className="font-headline-md text-headline-md font-bold text-on-surface mb-lg">
            Support Tickets Console
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase font-semibold">
                  <th className="py-md px-sm">Requester</th>
                  <th className="py-md px-sm">Subject / Issue</th>
                  <th className="py-md px-sm">Opened At</th>
                  <th className="py-md px-sm">Status</th>
                  <th className="py-md px-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-primary-container/5 transition-colors">
                    <td className="py-md px-sm">
                      <p className="font-label-md text-label-md font-bold text-on-surface">{t.user_name}</p>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{t.user_email}</span>
                    </td>
                    <td className="py-md px-sm max-w-[320px]">
                      <p className="font-label-md text-label-md font-semibold text-on-surface truncate">{t.subject}</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{t.description}</p>
                    </td>
                    <td className="py-md px-sm font-label-sm text-label-sm">
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                    <td className="py-md px-sm">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className={`h-8 rounded-lg font-label-sm text-label-sm px-xs border outline-none bg-transparent ${
                          t.status === "Open"
                            ? "border-error text-error"
                            : t.status === "In Progress"
                            ? "border-secondary text-secondary"
                            : "border-primary text-primary"
                        }`}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>
                    <td className="py-md px-sm text-right">
                      <button
                        onClick={() => handleDeleteTicket(t.id)}
                        className="p-sm text-error hover:bg-error-container/10 rounded-lg active:scale-95 duration-200"
                        title="Delete Ticket"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-xl text-center text-on-surface-variant font-label-md">
                      No support tickets logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Admin Management Tab ───────────────────────────────────────── */}
      {activeTab === "admin" && (
        <div className="max-w-xl space-y-xl">
          {/* Security Notice */}
          <div className="p-lg bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-md">
            <span className="material-symbols-outlined text-primary text-[24px] mt-[2px]">shield</span>
            <div>
              <p className="font-label-md text-label-md font-bold text-on-surface">Admin-Only Access</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
                Only you (an authenticated administrator) can create new admin accounts. Customers cannot
                sign up as admins — ever. This panel is hidden from all customer accounts.
              </p>
            </div>
          </div>

          {/* Create Admin Form */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
            <h4 className="font-headline-md text-headline-md font-bold text-on-surface mb-lg flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
              Create New Admin Account
            </h4>

            <form onSubmit={handleCreateAdmin} className="space-y-lg">
              {adminError && (
                <div className="p-md bg-error/10 border border-error/20 text-error text-body-sm rounded-lg">
                  {adminError}
                </div>
              )}
              {adminSuccess && (
                <div className="p-md bg-primary/10 border border-primary/20 text-primary text-body-sm rounded-lg">
                  {adminSuccess}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-xs group">
                <label className="font-label-md text-label-md text-on-surface-variant group-focus-within:text-primary transition-colors">
                  Full Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">
                    person
                  </span>
                  <input
                    type="text"
                    className="w-full h-12 pl-11 pr-md bg-transparent border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:border-primary transition-all outline-none"
                    placeholder="Jane Smith"
                    required
                    value={adminForm.full_name}
                    onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-xs group">
                <label className="font-label-md text-label-md text-on-surface-variant group-focus-within:text-primary transition-colors">
                  Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">
                    mail
                  </span>
                  <input
                    type="email"
                    className="w-full h-12 pl-11 pr-md bg-transparent border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:border-primary transition-all outline-none"
                    placeholder="admin@company.com"
                    required
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-xs group">
                <label className="font-label-md text-label-md text-on-surface-variant group-focus-within:text-primary transition-colors">
                  Temporary Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">
                    lock
                  </span>
                  <input
                    type="text"
                    className="w-full h-12 pl-11 pr-md bg-transparent border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:border-primary transition-all outline-none"
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full h-12 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-sm cursor-pointer"
              >
                {adminLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Admin...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                    <span>Create Admin Account</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
