import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { api } from "@/lib/api";
import {
  isValidKenyanPhoneNumber,
  normalizeKenyanPhoneNumber,
} from "@/lib/phone";

interface PaymentState {
  phoneNumber: string;
  accessMap: Record<string, boolean>;
  loading: boolean;
  paying: boolean;
  error: string | null;
  paymentSuccess: boolean;
  paymentPending: boolean;
  paymentMessage: string | null;
  transactionId: string | null;
}

const initialState: PaymentState = {
  phoneNumber: "",
  accessMap: {},
  loading: false,
  paying: false,
  error: null,
  paymentSuccess: false,
  paymentPending: false,
  paymentMessage: null,
  transactionId: null,
};

export const checkAccess = createAsyncThunk<
  { slug: string; access: boolean; phoneNumber: string },
  { slug: string; phone: string },
  { rejectValue: string }
>(
  "payment/checkAccess",
  async ({ slug, phone }, { rejectWithValue }) => {
    const phoneNumber = normalizeKenyanPhoneNumber(phone);

    if (!isValidKenyanPhoneNumber(phoneNumber)) {
      return rejectWithValue("Enter a valid Kenyan phone number.");
    }

    const res = await api.checkAccess(slug, phoneNumber);
    return { slug, access: res.access, phoneNumber };
  }
);

export const initiatePayment = createAsyncThunk<
  {
    slug: string;
    phoneNumber: string;
    access: boolean;
    status: "completed" | "pending" | "failed";
    transaction_id?: string;
    message?: string;
    detail?: string;
    amount?: number;
  },
  { slug: string; phone: string; customerName: string; customerEmail: string },
  { rejectValue: string }
>(
  "payment/initiate",
  async ({ slug, phone, customerName, customerEmail }, { rejectWithValue }) => {
    const phoneNumber = normalizeKenyanPhoneNumber(phone);

    if (!isValidKenyanPhoneNumber(phoneNumber)) {
      return rejectWithValue("Enter a valid Kenyan phone number.");
    }

    const cleanedName = customerName.trim();
    const cleanedEmail = customerEmail.trim().toLowerCase();

    if (!cleanedName) {
      return rejectWithValue("Enter your full name.");
    }

    if (!cleanedEmail) {
      return rejectWithValue("Enter your email address.");
    }

    const res = await api.initiatePayment(slug, phoneNumber, cleanedName, cleanedEmail);
    let access = Boolean(res.access);

    if (!access) {
      try {
        const accessCheck = await api.checkAccess(slug, phoneNumber);
        access = accessCheck.access;
      } catch {
        access = res.status === "completed";
      }
    }

    return { slug, phoneNumber, access, ...res };
  }
);

const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    setPhoneNumber(state, action: PayloadAction<string>) {
      state.phoneNumber = action.payload;
    },
    loadPhoneFromStorage(state) {
      if (typeof window !== "undefined") {
        state.phoneNumber = normalizeKenyanPhoneNumber(
          localStorage.getItem("cs_phone") || ""
        );
      }
    },
    clearPaymentState(state) {
      state.error = null;
      state.paymentSuccess = false;
      state.paymentPending = false;
      state.paymentMessage = null;
      state.transactionId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAccess.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAccess.fulfilled, (state, action) => {
        state.loading = false;
        state.phoneNumber = action.payload.phoneNumber;
        state.accessMap[action.payload.slug] = action.payload.access;
        if (action.payload.access) {
          state.paymentPending = false;
        }
      })
      .addCase(checkAccess.rejected, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.error = action.payload;
        }
      })
      .addCase(initiatePayment.pending, (state) => {
        state.paying = true;
        state.error = null;
        state.paymentSuccess = false;
        state.paymentPending = false;
        state.paymentMessage = null;
        state.transactionId = null;
      })
      .addCase(initiatePayment.fulfilled, (state, action) => {
        state.paying = false;
        state.phoneNumber = action.payload.phoneNumber;
        state.paymentMessage = action.payload.message || null;
        state.transactionId = action.payload.transaction_id || null;

        if (action.payload.access || action.payload.status === "completed") {
          state.paymentSuccess = true;
          state.accessMap[action.payload.slug] = true;
          state.paymentPending = false;
        } else if (action.payload.status === "pending") {
          state.paymentPending = true;
        }
      })
      .addCase(initiatePayment.rejected, (state, action) => {
        state.paying = false;
        state.error = action.payload || action.error.message || "Payment failed.";
      });
  },
});

export const { setPhoneNumber, loadPhoneFromStorage, clearPaymentState } = paymentSlice.actions;
export default paymentSlice.reducer;
