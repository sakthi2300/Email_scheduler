import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// ── Types ──

export interface Email {
  id: string;
  batchId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  jobId: string;
  status: "scheduled" | "processing" | "delayed" | "sent" | "failed";
  scheduledTime: string;
  sentTime: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: { smtpUser: string };
  batch?: { subject: string; body?: string };
  attempts?: EmailAttempt[];
}

export interface EmailAttempt {
  id: string;
  emailId: string;
  attemptNumber: number;
  status: "success" | "failed";
  errorMessage: string | null;
  attemptedAt: string;
}

export interface PaginatedResponse {
  data: Email[];
  total: number;
  page: number;
}

export interface ScheduleRequest {
  subject: string;
  body: string;
  leads: string[];
  senderId: string;
  startTime: string;
  delayBetweenEmailsMs: number;
  hourlyLimit: number;
}

export interface ScheduleResponse {
  batchId: string;
  totalScheduled: number;
}

export interface Sender {
  id: string;
  smtpUser: string;
  hourlyLimit: number;
  createdAt: string;
}

export interface UploadLeadsResponse {
  count: number;
  preview: string[];
  emails: string[];
}

// ── RTK Query API ──

export const emailApi = createApi({
  reducerPath: "emailApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include",
  }),
  tagTypes: ["ScheduledEmails", "SentEmails", "Senders"],
  endpoints: (builder) => ({
    // ── Scheduled Emails ──
    getScheduledEmails: builder.query<PaginatedResponse, { page?: number; limit?: number; search?: string }>({
      query: ({ page = 1, limit = 20, search }) => {
        let url = `/emails/scheduled?page=${page}&limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return url;
      },
      providesTags: ["ScheduledEmails"],
    }),

    // ── Sent Emails ──
    getSentEmails: builder.query<PaginatedResponse, { page?: number; limit?: number; status?: string; search?: string }>({
      query: ({ page = 1, limit = 20, status, search }) => {
        let url = `/emails/sent?page=${page}&limit=${limit}`;
        if (status) url += `&status=${status}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return url;
      },
      providesTags: ["SentEmails"],
    }),

    // ── Single Email ──
    getEmailById: builder.query<Email, string>({
      query: (id) => `/emails/${id}`,
    }),

    // ── Schedule Batch ──
    scheduleEmails: builder.mutation<ScheduleResponse, ScheduleRequest>({
      query: (body) => ({
        url: "/emails/schedule",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ScheduledEmails"],
    }),

    // ── Delete Email ──
    deleteEmail: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/emails/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ScheduledEmails", "SentEmails"],
    }),

    // ── Search ──
    searchEmails: builder.query<{ data: Email[]; total: number }, { q: string; page?: number }>({
      query: ({ q, page = 1 }) => `/emails/search?q=${encodeURIComponent(q)}&page=${page}`,
    }),

    // ── Senders ──
    getSenders: builder.query<{ data: Sender[] }, void>({
      query: () => "/senders",
      providesTags: ["Senders"],
    }),

    createSender: builder.mutation<Sender, { hourlyLimit?: number }>({
      query: (body) => ({
        url: "/senders",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Senders"],
    }),

    // ── Leads Upload ──
    uploadLeads: builder.mutation<UploadLeadsResponse, FormData>({
      query: (formData) => ({
        url: "/leads/upload",
        method: "POST",
        body: formData,
      }),
    }),
  }),
});

export const {
  useGetScheduledEmailsQuery,
  useGetSentEmailsQuery,
  useGetEmailByIdQuery,
  useScheduleEmailsMutation,
  useDeleteEmailMutation,
  useSearchEmailsQuery,
  useGetSendersQuery,
  useCreateSenderMutation,
  useUploadLeadsMutation,
} = emailApi;
