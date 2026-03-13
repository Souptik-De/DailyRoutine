import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;

// ─── Journals ─────────────────────────────────────────────────────────────────
export const journalsApi = {
  list: () => api.get("/api/journals"),
  getByDate: (date: string) => api.get(`/api/journals/${date}`),
  create: (data: { content: string; date: string }) => api.post("/api/journals", data),
  update: (id: string, content: string) => api.put(`/api/journals/${id}`, { content }),
  delete: (id: string) => api.delete(`/api/journals/${id}`),
};

// ─── Habits ───────────────────────────────────────────────────────────────────
export const habitsApi = {
  list: () => api.get("/api/habits"),
  create: (data: { name: string; description?: string; color?: string }) =>
    api.post("/api/habits", data),
  update: (id: string, data: { name?: string; description?: string; color?: string }) =>
    api.put(`/api/habits/${id}`, data),
  delete: (id: string) => api.delete(`/api/habits/${id}`),
  getStreak: (id: string) => api.get(`/api/habits/${id}/streak`),
};

// ─── Completions ──────────────────────────────────────────────────────────────
export const completionsApi = {
  getForDate: (date: string) => api.get(`/api/completions/${date}`),
  getRange: (startDate: string, endDate: string) =>
    api.get("/api/completions/range", { params: { start_date: startDate, end_date: endDate } }),
  markComplete: (date: string, habitId: string) =>
    api.post(`/api/completions/${date}/${habitId}`),
  markIncomplete: (date: string, habitId: string) =>
    api.delete(`/api/completions/${date}/${habitId}`),
};
