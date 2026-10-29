import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { api } from "../api";

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isCustomer = user.role === "customer";

  const fetchTickets = async (isBackground = false) => {
    try {
      const data = await api.get("/tickets");
      setTickets(data);
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Auto-sync every 2.5 seconds so customer deletions reflect in real time on admin side
    const interval = setInterval(() => {
      fetchTickets(true);
    }, 2500);

    // Also sync immediately when window gains focus (e.g. switching between tabs)
    const onFocus = () => fetchTickets(true);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setCreating(true);
    setError("");

    try {
      await api.post("/tickets", { subject, description });
      setSubject("");
      setSubject("");
      setDescription("");
      fetchTickets();
    } catch (err) {
      setError(err.message || "Failed to submit ticket");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    try {
      await api.delete(`/tickets/${ticketId}`);
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    } catch (err) {
      console.error("Failed to delete ticket:", err);
      alert(err.message || "Failed to delete ticket");
    }
  };

  if (loading) {
    return (
      <Layout pageTitle="Support Tickets">
        <div className="flex h-64 items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Support Tickets">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        
        {/* Create Manual Ticket (mainly for Customer dashboard) */}
        {isCustomer && (
          <div className="space-y-lg">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-xs">
                File a Ticket
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-xl">
                Need extra human assistance? Open a ticket directly, and our customer support team will handle it.
              </p>

              <form onSubmit={handleCreateTicket} className="space-y-md">
                {error && (
                  <div className="p-md bg-error-container/10 border border-error/20 text-error text-body-sm rounded-lg">
                    {error}
                  </div>
                )}

                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Account billing issues"
                    className="w-full h-11 px-md bg-transparent border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface focus:border-primary input-halo transition-all outline-none"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant">Describe the issue</label>
                  <textarea
                    required
                    rows="4"
                    placeholder="Provide details about your query..."
                    className="w-full p-md bg-transparent border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface focus:border-primary input-halo transition-all outline-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full h-11 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:shadow-lg active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-xs"
                >
                  {creating ? (
                    <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      <span>Submit Ticket</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tickets List */}
        <div className={isCustomer ? "lg:col-span-2 space-y-lg" : "lg:col-span-3 space-y-lg"}>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-xs">
              {isCustomer ? "Your Filed Tickets" : "Company Support Tickets"}
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-xl">
              {isCustomer
                ? "Review and track the real-time status of your support questions."
                : "Manage and resolve issues submitted automatically by RAG thresholds or manually by clients."}
            </p>

            <div className="space-y-md">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-xl border border-outline-variant rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-md hover:bg-surface-container-low transition-colors"
                >
                  <div className="space-y-xs flex-1">
                    <div className="flex items-center gap-sm">
                      <h4 className="font-label-md text-label-md font-bold text-on-surface">
                        {t.subject}
                      </h4>
                      <span
                        className={`px-sm py-[2px] rounded-full font-label-sm text-label-sm ${
                          t.status === "Open"
                            ? "bg-error-container/10 text-error border border-error/15"
                            : t.status === "In Progress"
                            ? "bg-secondary-container/10 text-secondary border border-secondary/15"
                            : "bg-primary-container/10 text-primary border border-primary/15"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t.description}
                    </p>
                    <div className="flex flex-wrap gap-md font-label-sm text-label-sm text-on-surface-variant opacity-75 mt-xs">
                      <span>Ref ID: {t.id}</span>
                      <span>•</span>
                      <span>Opened: {new Date(t.created_at).toLocaleString()}</span>
                      {!isCustomer && (
                        <>
                          <span>•</span>
                          <span>By: {t.user_name} ({t.user_email})</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions: Delete button */}
                  <div className="flex items-center gap-sm shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteTicket(t.id)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant/70 hover:text-error hover:bg-error/10 border border-outline-variant/60 hover:border-error/20 transition-all duration-150 cursor-pointer"
                      title="Delete ticket"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}

              {tickets.length === 0 && (
                <p className="text-on-surface-variant font-label-md text-center py-xl bg-surface-container-low rounded-xl border border-dashed border-outline-variant/60">
                  No tickets logged at this time.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
