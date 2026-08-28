import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// ── Types ──

export interface SlackStatus {
  connected: boolean;
  teamId: string | null;
  connectedAt: string | null;
}

// ── RTK Query API ──

export const slackApi = createApi({
  reducerPath: "slackApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/slack",
    credentials: "include",
  }),
  tagTypes: ["SlackStatus"],
  endpoints: (builder) => ({
    getSlackStatus: builder.query<SlackStatus, void>({
      query: () => "/status",
      providesTags: ["SlackStatus"],
    }),

    disconnectSlack: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/disconnect",
        method: "DELETE",
      }),
      invalidatesTags: ["SlackStatus"],
    }),
  }),
});

export const { useGetSlackStatusQuery, useDisconnectSlackMutation } = slackApi;
