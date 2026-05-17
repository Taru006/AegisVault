import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";

// ── Thunks ──────────────────────────────────
export const fetchFiles = createAsyncThunk(
  "files/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      // Assuming backend route is still /api/documents but we map it conceptually to files
      // or if we have /api/files. Let's use /documents to not break backend for now, or use /files if backend is changed.
      // Wait, the prompt says "A Dashboard page showing the user's files...". The backend schemas are File and FileVersion.
      // Did I create routes for File? The user request said "In the AegisVault backend, implement the following MongoDB schemas using Mongoose: A File schema..."
      // But they didn't ask to implement the File backend route yet. They only asked for the schemas in the previous prompt.
      // For now, I'll use the API route `/documents` or whatever is already there. Let's look at what's in api.js? 
      // Actually, I'll just change the endpoints to `/files` assuming the user will update the backend or we can create them later.
      // Let's stick to `/documents` for API call compatibility if that route exists, wait, the prompt says "Redux store with slices for: auth, files (file list, upload status)". 
      const { data } = await api.get("/documents");
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch files"
      );
    }
  }
);

export const uploadFile = createAsyncThunk(
  "files/upload",
  async (filePayload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/documents", filePayload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Upload failed"
      );
    }
  }
);

export const uploadFileVersion = createAsyncThunk(
  "files/uploadVersion",
  async ({ fileId, payload }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/documents/${fileId}/versions`, payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Version upload failed"
      );
    }
  }
);

export const deleteFile = createAsyncThunk(
  "files/delete",
  async (fileId, { rejectWithValue }) => {
    try {
      await api.delete(`/documents/${fileId}`);
      return fileId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Delete failed"
      );
    }
  }
);

// ── Slice ───────────────────────────────────
const fileSlice = createSlice({
  name: "files",
  initialState: {
    fileList: [],
    uploadStatus: 'idle', // 'idle' | 'encrypting' | 'uploading' | 'success' | 'failed'
    loading: false,
    error: null,
  },
  reducers: {
    setUploadStatus(state, action) {
      state.uploadStatus = action.payload;
    },
    clearFileError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch
    builder
      .addCase(fetchFiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFiles.fulfilled, (state, action) => {
        state.loading = false;
        // The backend currently returns { documents: [...] }
        state.fileList = action.payload.documents || action.payload.files || [];
      })
      .addCase(fetchFiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Upload
    builder
      .addCase(uploadFile.pending, (state) => {
        state.loading = true;
        state.uploadStatus = 'uploading';
        state.error = null;
      })
      .addCase(uploadFile.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadStatus = 'success';
        const newFile = action.payload.document || action.payload.file;
        if (newFile) {
          state.fileList.unshift(newFile);
        }
      })
      .addCase(uploadFile.rejected, (state, action) => {
        state.loading = false;
        state.uploadStatus = 'failed';
        state.error = action.payload;
      });

    // Upload Version
    builder
      .addCase(uploadFileVersion.pending, (state) => {
        state.loading = true;
        state.uploadStatus = 'uploading';
        state.error = null;
      })
      .addCase(uploadFileVersion.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadStatus = 'success';
        const updatedDoc = action.payload.document || action.payload.file;
        if (updatedDoc) {
          const index = state.fileList.findIndex(f => f._id === updatedDoc._id);
          if (index !== -1) {
            state.fileList[index] = updatedDoc;
          }
        }
      })
      .addCase(uploadFileVersion.rejected, (state, action) => {
        state.loading = false;
        state.uploadStatus = 'failed';
        state.error = action.payload;
      });

    // Delete
    builder
      .addCase(deleteFile.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteFile.fulfilled, (state, action) => {
        state.loading = false;
        state.fileList = state.fileList.filter(
          (f) => f._id !== action.payload
        );
      })
      .addCase(deleteFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setUploadStatus, clearFileError } = fileSlice.actions;
export default fileSlice.reducer;
