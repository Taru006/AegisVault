import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";

// ── Thunks ──────────────────────────────────
export const fetchDocuments = createAsyncThunk(
  "documents/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/documents");
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch documents"
      );
    }
  }
);

export const uploadDocument = createAsyncThunk(
  "documents/upload",
  async (docPayload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/documents", docPayload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Upload failed"
      );
    }
  }
);

export const deleteDocument = createAsyncThunk(
  "documents/delete",
  async (docId, { rejectWithValue }) => {
    try {
      await api.delete(`/documents/${docId}`);
      return docId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Delete failed"
      );
    }
  }
);

// ── Slice ───────────────────────────────────
const documentSlice = createSlice({
  name: "documents",
  initialState: {
    documents: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearDocError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload.documents;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Upload
    builder
      .addCase(uploadDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.documents.unshift(action.payload.document);
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete
    builder
      .addCase(deleteDocument.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = state.documents.filter(
          (d) => d._id !== action.payload
        );
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearDocError } = documentSlice.actions;
export default documentSlice.reducer;
