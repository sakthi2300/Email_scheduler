import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import authReducer from "../features/auth/authSlice";
import { emailApi } from "../features/emails/emailApi";
import { slackApi } from "../features/slack/slackApi";

/**
 * Redux store — auth state via Redux Toolkit slice,
 * all server state via RTK Query.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    [emailApi.reducerPath]: emailApi.reducer,
    [slackApi.reducerPath]: slackApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(emailApi.middleware)
      .concat(slackApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
