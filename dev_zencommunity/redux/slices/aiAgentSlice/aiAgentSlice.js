import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API, handleSliceError, handleSliceSuccess, namespace } from "@Utils/helper";

export const AI_NAMESPACE = `${namespace}/ai-agent`;

/* ─────────────────────────── Preferences ─────────────────────────── */

export const fetchAiAgentPreference = createAsyncThunk(
    "aiAgent/fetchAiAgentPreference",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/preference`);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const updateAiAgentPreference = createAsyncThunk(
    "aiAgent/updateAiAgentPreference",
    async (payload, thunkAPI) => {
        try {
            const res = await API.post(`${AI_NAMESPACE}/preference`, payload);
            handleSliceSuccess(thunkAPI, "AI agent preferences updated successfully");
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

/* ─────────────────────────── Knowledge gaps (self-learning) ─────────────────────────── */

export const fetchKnowledgeGaps = createAsyncThunk(
    "aiAgent/fetchKnowledgeGaps",
    async (params = {}, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/kb-gaps`, { params });
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const dismissKnowledgeGap = createAsyncThunk(
    "aiAgent/dismissKnowledgeGap",
    async (id, thunkAPI) => {
        try {
            await API.post(`${AI_NAMESPACE}/kb-gaps/${id}/dismiss`);
            return id;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

/**
 * Draft a KB article from a conversation — either a queued gap (gap_id) or
 * directly off a ticket/chat that was never flagged as one (source + source_id).
 * Always comes back as a draft post for a human to review before it reaches
 * the vector store on the next knowledge-base sync.
 */
export const promoteToKnowledgeBase = createAsyncThunk(
    "aiAgent/promoteToKnowledgeBase",
    async (payload, thunkAPI) => {
        try {
            const res = await API.post(`${AI_NAMESPACE}/kb-promote`, payload);
            handleSliceSuccess(thunkAPI, "Draft article created — review and publish it to add it to the knowledge base.");
            return { ...res.data, gap_id: payload?.gap_id };
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

/* ─────────────────────────── Providers ─────────────────────────── */

export const fetchAiProviders = createAsyncThunk(
    "aiAgent/fetchAiProviders",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/preference/providers`);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const fetchAiProviderSettings = createAsyncThunk(
    "aiAgent/fetchAiProviderSettings",
    async (provider, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/preference/provider/${provider}`);
            return { provider, data: res.data };
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const updateAiProviderSettings = createAsyncThunk(
    "aiAgent/updateAiProviderSettings",
    async ({ provider, payload }, thunkAPI) => {
        try {
            const res = await API.post(`${AI_NAMESPACE}/preference/provider/${provider}`, payload);
            handleSliceSuccess(thunkAPI, "Provider settings updated successfully");
            return { provider, data: res.data };
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

/* ─────────────────────────── OpenAI Agents ─────────────────────────── */

export const fetchOpenAiAgents = createAsyncThunk(
    "aiAgent/fetchOpenAiAgents",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/open-ai/agents`);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

/**
 * The knowledge base every connected site searches in addition to its own.
 *
 * Community-wide by definition, which is why it is set here rather than on a
 * site's own AI Settings screen — saving it from one site would silently
 * change what the assistant knows on all of them.
 */
export const fetchSharedAgent = createAsyncThunk(
    "aiAgent/fetchSharedAgent",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/livechat/shared-agent`);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const updateSharedAgent = createAsyncThunk(
    "aiAgent/updateSharedAgent",
    async (shared_agent_id, thunkAPI) => {
        try {
            const res = await API.post(`${AI_NAMESPACE}/livechat/shared-agent`, { shared_agent_id });
            handleSliceSuccess(thunkAPI, "Shared knowledge base updated");
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const createOpenAiAgent = createAsyncThunk(
    "aiAgent/createOpenAiAgent",
    async (payload, thunkAPI) => {
        try {
            const res = await API.post(`${AI_NAMESPACE}/open-ai/agents`, payload);
            handleSliceSuccess(thunkAPI, "Agent created successfully");
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const getOpenAiAgent = createAsyncThunk(
    "aiAgent/getOpenAiAgent",
    async (store_id, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/open-ai/agent/${store_id}`);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const updateOpenAiAgent = createAsyncThunk(
    "aiAgent/updateOpenAiAgent",
    async ({ store_id, payload }, thunkAPI) => {
        try {
            const res = await API.put(`${AI_NAMESPACE}/open-ai/agent/${store_id}`, payload);
            handleSliceSuccess(thunkAPI, "Agent updated successfully");
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const deleteOpenAiAgent = createAsyncThunk(
    "aiAgent/deleteOpenAiAgent",
    async (store_id, thunkAPI) => {
        try {
            await API.delete(`${AI_NAMESPACE}/open-ai/agent/${store_id}`);
            handleSliceSuccess(thunkAPI, "Agent deleted successfully");
            return store_id;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

/* ─────────────────────────── OpenAI Agent Files ─────────────────────────── */

export const fetchOpenAiAgentFiles = createAsyncThunk(
    "aiAgent/fetchOpenAiAgentFiles",
    async (store_id, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/open-ai/agent/${store_id}/files`);
            return { store_id, data: res.data };
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const attachFileToAgent = createAsyncThunk(
    "aiAgent/attachFileToAgent",
    async ({ store_id, fid }, thunkAPI) => {
        try {
            const res = await API.post(`${AI_NAMESPACE}/open-ai/agent/${store_id}/files`, { fid });
            handleSliceSuccess(thunkAPI, "File attached successfully");
            return { store_id, data: res.data };
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const detachFileFromAgent = createAsyncThunk(
    "aiAgent/detachFileFromAgent",
    async ({ store_id, fid }, thunkAPI) => {
        try {
            await API.delete(`${AI_NAMESPACE}/open-ai/agent/${store_id}/files`, { data: { fid } });
            handleSliceSuccess(thunkAPI, "File detached successfully");
            return { store_id, fid };
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

/* ─────────────────────────── OpenAI Files ─────────────────────────── */

export const fetchOpenAiFiles = createAsyncThunk(
    "aiAgent/fetchOpenAiFiles",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/open-ai/files`);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

/**
 * Upload a file straight into one knowledge base.
 *
 * The two-step — upload on one screen, attach on another — is what left files
 * sitting in the account attached to nothing. From inside a knowledge base
 * there is only one place the file could be going, so it goes there.
 */
export const uploadFileToAgent = createAsyncThunk(
    "aiAgent/uploadFileToAgent",
    async ({ storeId, file }, thunkAPI) => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await API.post(`${AI_NAMESPACE}/open-ai/agent/${storeId}/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            handleSliceSuccess(thunkAPI, "File added to this knowledge base");
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const uploadOpenAiFile = createAsyncThunk(
    "aiAgent/uploadOpenAiFile",
    async (file, thunkAPI) => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await API.post(`${AI_NAMESPACE}/open-ai/files`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            handleSliceSuccess(thunkAPI, "File uploaded successfully");
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const getOpenAiFile = createAsyncThunk(
    "aiAgent/getOpenAiFile",
    async (fid, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/open-ai/file/${fid}`);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const deleteOpenAiFile = createAsyncThunk(
    "aiAgent/deleteOpenAiFile",
    async (fid, thunkAPI) => {
        try {
            await API.delete(`${AI_NAMESPACE}/open-ai/file/${fid}`);
            handleSliceSuccess(thunkAPI, "File deleted successfully");
            return fid;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

/* ─────────────────────────── Website Crawler ─────────────────────────── */

export const fetchActiveKbCrawl = createAsyncThunk(
    "aiAgent/fetchActiveKbCrawl",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/kb-crawler/active`);
            return res.data ?? null;
        } catch (e) {
            return null;
        }
    }
);

export const startKbCrawl = createAsyncThunk(
    "aiAgent/startKbCrawl",
    async (payload, thunkAPI) => {
        try {
            const res = await API.post(`${AI_NAMESPACE}/kb-crawler`, payload);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const pollKbCrawl = createAsyncThunk(
    "aiAgent/pollKbCrawl",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/kb-crawler/active`);
            return res.data ?? null;
        } catch (e) {
            return null;
        }
    }
);

export const cancelKbCrawl = createAsyncThunk(
    "aiAgent/cancelKbCrawl",
    async (job_id, thunkAPI) => {
        try {
            await API.delete(`${AI_NAMESPACE}/kb-crawler/${job_id}`);
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const uploadKbCrawl = createAsyncThunk(
    "aiAgent/uploadKbCrawl",
    async ({ job_id, store_id = '' }, thunkAPI) => {
        try {
            const res = await API.post(`${AI_NAMESPACE}/kb-crawler/${job_id}/upload`, { store_id });
            handleSliceSuccess(
                thunkAPI,
                res.data?.attached
                    ? "Generated file added and attached to the knowledge base"
                    : "Generated file added to the knowledge base"
            );
            thunkAPI.dispatch(fetchOpenAiFiles());
            thunkAPI.dispatch(fetchKbCrawlHistory());
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const fetchKbCrawlHistory = createAsyncThunk(
    "aiAgent/fetchKbCrawlHistory",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/kb-crawler/history`);
            return Array.isArray(res.data) ? res.data : [];
        } catch (e) {
            return [];
        }
    }
);

export const clearKbCrawlHistory = createAsyncThunk(
    "aiAgent/clearKbCrawlHistory",
    async (_, thunkAPI) => {
        try {
            await API.delete(`${AI_NAMESPACE}/kb-crawler/history`);
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

/**
 * A look at what a crawl actually pulled out before committing to an upload.
 * Fetched on demand rather than folded into the polled job status — the rows
 * can run to hundreds of KB, far more than belongs in something re-requested
 * every 2 seconds while a crawl runs.
 */
export const fetchKbCrawlPreview = createAsyncThunk(
    "aiAgent/fetchKbCrawlPreview",
    async ({ job_id, limit = 100 }, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/kb-crawler/${job_id}/preview`, { params: { limit } });
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const fetchKbCrawlSchedule = createAsyncThunk(
    "aiAgent/fetchKbCrawlSchedule",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/kb-crawler/schedule`);
            return Array.isArray(res.data) ? res.data : [];
        } catch (e) {
            return [];
        }
    }
);

export const addKbCrawlSchedule = createAsyncThunk(
    "aiAgent/addKbCrawlSchedule",
    async (payload, thunkAPI) => {
        try {
            const res = await API.post(`${AI_NAMESPACE}/kb-crawler/schedule`, payload);
            handleSliceSuccess(thunkAPI, "Site added to the auto-update schedule");
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const updateKbCrawlSchedule = createAsyncThunk(
    "aiAgent/updateKbCrawlSchedule",
    async ({ id, ...payload }, thunkAPI) => {
        try {
            const res = await API.post(`${AI_NAMESPACE}/kb-crawler/schedule/${id}`, payload);
            handleSliceSuccess(thunkAPI, "Auto-update schedule saved");
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const toggleKbCrawlSchedule = createAsyncThunk(
    "aiAgent/toggleKbCrawlSchedule",
    async ({ id, enabled }, thunkAPI) => {
        try {
            const res = await API.post(`${AI_NAMESPACE}/kb-crawler/schedule/${id}/toggle`, { enabled });
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const deleteKbCrawlSchedule = createAsyncThunk(
    "aiAgent/deleteKbCrawlSchedule",
    async (id, thunkAPI) => {
        try {
            await API.delete(`${AI_NAMESPACE}/kb-crawler/schedule/${id}`);
            handleSliceSuccess(thunkAPI, "Auto-update schedule removed");
            return id;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

/* ─────────────────────────── Content Export ─────────────────────────── */

export const fetchExportPostTypes = createAsyncThunk(
    "aiAgent/fetchExportPostTypes",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/content-export/post-types`);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const startContentExport = createAsyncThunk(
    "aiAgent/startContentExport",
    async (payload, thunkAPI) => {
        try {
            const res = await API.post(`${AI_NAMESPACE}/content-export`, payload);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const pollExportStatus = createAsyncThunk(
    "aiAgent/pollExportStatus",
    async (job_id, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/content-export/status/${job_id}`);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const uploadExportToOpenAi = createAsyncThunk(
    "aiAgent/uploadExportToOpenAi",
    async ({ job_id, previous_fids = {} }, thunkAPI) => {
        try {
            const res = await API.post(`${AI_NAMESPACE}/content-export/upload`, { job_id, previous_fids });
            thunkAPI.dispatch(fetchOpenAiFiles());
            thunkAPI.dispatch(fetchExportHistory());
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const fetchExportHistory = createAsyncThunk(
    "aiAgent/fetchExportHistory",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/content-export/history`);
            return Array.isArray(res.data) ? res.data : [];
        } catch (e) {
            return [];
        }
    }
);

export const cancelContentExport = createAsyncThunk(
    "aiAgent/cancelContentExport",
    async (job_id, thunkAPI) => {
        try {
            await API.delete(`${AI_NAMESPACE}/content-export/${job_id}`);
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const fetchActiveExportJob = createAsyncThunk(
    "aiAgent/fetchActiveExportJob",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/content-export/active`);
            return res.data ?? null;
        } catch (e) {
            return null;
        }
    }
);

/* ─────────────────────────── Livechat Products ─────────────────────────── */

export const fetchLivechatProducts = createAsyncThunk(
    "aiAgent/fetchLivechatProducts",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/livechat/products`);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

/* ─────────────────────────── Messages ─────────────────────────── */

export const fetchAiMessages = createAsyncThunk(
    "aiAgent/fetchAiMessages",
    async (params = {}, thunkAPI) => {
        try {
            const res = await API.get(`${AI_NAMESPACE}/messages`, { params });
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const deleteAiMessage = createAsyncThunk(
    "aiAgent/deleteAiMessage",
    async (id, thunkAPI) => {
        try {
            await API.delete(`${AI_NAMESPACE}/message/${id}`);
            handleSliceSuccess(thunkAPI, "Message deleted successfully");
            return id;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

// Clear the log for a window of time. The endpoint reports how many rows went,
// which is worth showing: a purge that quietly removed nothing looks the same as
// one that worked.
export const purgeAiMessages = createAsyncThunk(
    "aiAgent/purgeAiMessages",
    async ({ from, to }, thunkAPI) => {
        try {
            const res = await API.delete(`${AI_NAMESPACE}/messages`, { params: { from, to } });
            const deleted = res.data?.deleted ?? 0;
            handleSliceSuccess(
                thunkAPI,
                deleted === 1
                    ? "1 log entry deleted"
                    : `${deleted} log entries deleted`
            );
            return deleted;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const updateAiMessage = createAsyncThunk(
    "aiAgent/updateAiMessage",
    async ({ id, message }, thunkAPI) => {
        try {
            const res = await API.patch(`${AI_NAMESPACE}/message/${id}`, { message });
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

/* ─────────────────────────── Slice ─────────────────────────── */

const aiAgentSlice = createSlice({
    name: "aiAgent",
    initialState: {
        preference: null,
        preferenceStatus: "idle",
        knowledgeGaps: { records: [], status: "idle", total: 0 },
        providers: [],
        providersStatus: "idle",
        providerSettings: {},
        providerSettingsStatus: {}, // keyed by provider name: 'idle' | 'loading'
        agents: {
            records: [],
            status: "idle",
        },
        selectedAgent: null,
        files: {
            records: [],
            status: "idle",
        },
        agentFiles: {},
        fileDetails: {},
        messages: { records: [], status: "idle", total: 0, page: 1, per_page: 15, requestId: null },
        livechatProducts: [],
        sharedAgentId: '',
        sharedAgentStatus: 'idle',
        exportPostTypes: [],
        exportPostTypesStatus: "idle",
        exportJob: null,
        exportStarting: false,
        exportUploading: false,
        exportHistory: [],
        kbCrawlJob: null,
        kbCrawlStarting: false,
        kbCrawlUploading: false,
        kbCrawlHistory: [],
        kbCrawlPreview: { rows: [], total: 0, status: "idle" },
        kbCrawlSchedules: [],
        kbCrawlScheduleSaving: false,
        status: "idle",
        error: null,
    },
    reducers: {
        clearSelectedAgent: (state) => {
            state.selectedAgent = null;
        },
    },
    extraReducers: (builder) => {
        builder
            /* preference */
            .addCase(fetchAiAgentPreference.pending, (state) => {
                state.preferenceStatus = "loading";
            })
            .addCase(fetchAiAgentPreference.fulfilled, (state, action) => {
                state.preferenceStatus = "idle";
                state.preference = action.payload;
            })
            .addCase(fetchAiAgentPreference.rejected, (state) => {
                state.preferenceStatus = "idle";
            })
            .addCase(updateAiAgentPreference.fulfilled, (state, action) => {
                state.preference = action.payload;
            })
            /* knowledge gaps */
            .addCase(fetchKnowledgeGaps.pending, (state) => {
                if (!state.knowledgeGaps.records?.length) {
                    state.knowledgeGaps.status = "loading";
                }
            })
            .addCase(fetchKnowledgeGaps.fulfilled, (state, action) => {
                state.knowledgeGaps.status = "idle";
                state.knowledgeGaps.records = action.payload?.records ?? action.payload?.data ?? [];
                state.knowledgeGaps.total = action.payload?.total ?? state.knowledgeGaps.records.length;
            })
            .addCase(fetchKnowledgeGaps.rejected, (state) => {
                state.knowledgeGaps.status = "idle";
            })
            .addCase(dismissKnowledgeGap.fulfilled, (state, action) => {
                state.knowledgeGaps.records = state.knowledgeGaps.records.filter(
                    (g) => Number(g.id) !== Number(action.payload)
                );
            })
            .addCase(promoteToKnowledgeBase.fulfilled, (state, action) => {
                // Promoted from the gap queue — it leaves the "open" list either
                // way, so drop it rather than wait on a refetch.
                if (action.payload?.gap_id) {
                    state.knowledgeGaps.records = state.knowledgeGaps.records.filter(
                        (g) => Number(g.id) !== Number(action.payload.gap_id)
                    );
                }
            })
            /* providers */
            .addCase(fetchAiProviders.pending, (state) => {
                state.providersStatus = "loading";
            })
            .addCase(fetchAiProviders.fulfilled, (state, action) => {
                state.providersStatus = "idle";
                state.providers = action.payload;
            })
            .addCase(fetchAiProviders.rejected, (state) => {
                state.providersStatus = "idle";
            })
            .addCase(fetchAiProviderSettings.pending, (state, action) => {
                state.providerSettingsStatus[action.meta.arg] = "loading";
            })
            .addCase(fetchAiProviderSettings.fulfilled, (state, action) => {
                state.providerSettingsStatus[action.payload.provider] = "idle";
                state.providerSettings[action.payload.provider] = action.payload.data;
            })
            .addCase(fetchAiProviderSettings.rejected, (state, action) => {
                state.providerSettingsStatus[action.meta.arg] = "idle";
            })
            .addCase(updateAiProviderSettings.fulfilled, (state, action) => {
                state.providerSettings[action.payload.provider] = action.payload.data;
            })
            /* agents */
            .addCase(fetchOpenAiAgents.pending, (state) => {
                // First load only — see fetchOpenAiFiles.pending.
                if (!state.agents.records?.length) {
                    state.agents.status = "loading";
                }
            })
            .addCase(fetchOpenAiAgents.fulfilled, (state, action) => {
                state.agents.status = "idle";
                state.agents.records = action.payload?.records ?? action.payload?.data ?? [];
            })
            .addCase(createOpenAiAgent.fulfilled, (state, action) => {
                // Prepending unconditionally showed the same knowledge base
                // several times over when create resolved more than once — a
                // double-submit, or a create followed by a list that already
                // included it. The row is identified by its store id; replace a
                // match rather than stacking another copy on top of it.
                const id = action.payload?.store_id ?? action.payload?.id;
                const rest = id
                    ? state.agents.records.filter((a) => (a.store_id ?? a.id) !== id)
                    : state.agents.records;
                state.agents.records = [action.payload, ...rest];
            })
            .addCase(getOpenAiAgent.fulfilled, (state, action) => {
                state.selectedAgent = action.payload;
                // also update the record in the list if present
                state.agents.records = state.agents.records.map((a) =>
                    (a.store_id ?? a.id) === (action.payload?.store_id ?? action.payload?.id)
                        ? { ...a, ...action.payload }
                        : a
                );
            })
            .addCase(updateOpenAiAgent.fulfilled, (state, action) => {
                state.agents.records = state.agents.records.map((a) =>
                    a.store_id === action.payload?.store_id ? { ...a, ...action.payload } : a
                );
                if (state.selectedAgent?.store_id === action.payload?.store_id) {
                    state.selectedAgent = { ...state.selectedAgent, ...action.payload };
                }
            })
            .addCase(deleteOpenAiAgent.fulfilled, (state, action) => {
                state.agents.records = state.agents.records.filter(
                    (a) => a.store_id !== action.payload
                );
                if (state.selectedAgent?.store_id === action.payload) {
                    state.selectedAgent = null;
                }
            })
            /* agent files */
            .addCase(fetchOpenAiAgentFiles.fulfilled, (state, action) => {
                const raw = action.payload.data;
                state.agentFiles[action.payload.store_id] =
                    Array.isArray(raw) ? raw : (raw?.records ?? raw?.data ?? []);
            })
            .addCase(attachFileToAgent.fulfilled, (state, action) => {
                const { store_id, data } = action.payload;
                if (state.agentFiles[store_id]) {
                    state.agentFiles[store_id] = [...state.agentFiles[store_id], data];
                } else {
                    state.agentFiles[store_id] = [data];
                }
            })
            .addCase(detachFileFromAgent.fulfilled, (state, action) => {
                const { store_id, fid } = action.payload;
                if (state.agentFiles[store_id]) {
                    state.agentFiles[store_id] = state.agentFiles[store_id].filter(
                        (f) => f.fid !== fid && f.id !== fid
                    );
                }
            })
            /* files */
            .addCase(fetchOpenAiFiles.pending, (state) => {
                // Only the first load is a "loading" state. A refresh over a
                // list that is already on screen is a background refresh, and
                // flagging it as loading replaces every visible row with a
                // skeleton for the length of the round trip — the table appears
                // to be rebuilt from scratch because, visually, it is.
                if (!state.files.records?.length) {
                    state.files.status = "loading";
                }
            })
            .addCase(fetchOpenAiFiles.fulfilled, (state, action) => {
                state.files.status = "idle";
                state.files.records = action.payload?.records ?? action.payload?.data ?? [];
            })
            .addCase(uploadOpenAiFile.fulfilled, (state, action) => {
                state.files.records = [action.payload, ...state.files.records];
            })
            .addCase(deleteOpenAiFile.fulfilled, (state, action) => {
                state.files.records = state.files.records.filter(
                    (f) => f.fid !== action.payload && f.id !== action.payload
                );
            })
            .addCase(getOpenAiFile.fulfilled, (state, action) => {
                const key = action.payload?.fid ?? action.payload?.id;
                if (key) state.fileDetails[key] = action.payload;
            })
            /* livechat products */
            .addCase(fetchLivechatProducts.fulfilled, (state, action) => {
                state.livechatProducts = action.payload?.records ?? [];
            })
            /* shared knowledge base */
            .addCase(fetchSharedAgent.pending, (state) => {
                state.sharedAgentStatus = 'loading';
            })
            .addCase(fetchSharedAgent.fulfilled, (state, action) => {
                state.sharedAgentId = action.payload?.shared_agent_id ?? '';
                state.sharedAgentStatus = 'idle';
            })
            .addCase(fetchSharedAgent.rejected, (state) => {
                state.sharedAgentStatus = 'idle';
            })
            .addCase(updateSharedAgent.pending, (state) => {
                state.sharedAgentStatus = 'saving';
            })
            .addCase(updateSharedAgent.fulfilled, (state, action) => {
                state.sharedAgentId = action.payload?.shared_agent_id ?? '';
                state.sharedAgentStatus = 'idle';
            })
            .addCase(updateSharedAgent.rejected, (state) => {
                state.sharedAgentStatus = 'idle';
            })
            /* messages */
            // Only the newest request may write. Changing a date filter fires a
            // fetch per keystroke of the picker, and the responses do not have
            // to come back in the order they were sent - an earlier, wider one
            // landing last would leave the list showing rows the filter
            // excludes, and the count beside the delete button describing a
            // range nobody asked for.
            .addCase(fetchAiMessages.pending, (state, action) => {
                state.messages.status = "loading";
                state.messages.requestId = action.meta.requestId;
            })
            .addCase(fetchAiMessages.fulfilled, (state, action) => {
                if (state.messages.requestId && state.messages.requestId !== action.meta.requestId) return;
                state.messages.status = "idle";
                state.messages.records = action.payload?.records ?? action.payload?.data ?? [];
                state.messages.total = action.payload?.total ?? 0;
                state.messages.page = action.payload?.page ?? 1;
                state.messages.per_page = action.payload?.per_page ?? 15;
            })
            .addCase(fetchAiMessages.rejected, (state, action) => {
                if (state.messages.requestId && state.messages.requestId !== action.meta.requestId) return;
                state.messages.status = "idle";
            })
            .addCase(deleteAiMessage.fulfilled, (state, action) => {
                state.messages.records = state.messages.records.filter(
                    (m) => m.id !== action.payload
                );
            })
            .addCase(updateAiMessage.fulfilled, (state, action) => {
                state.messages.records = state.messages.records.map((m) =>
                    Number(m.id) === Number(action.payload?.id) ? { ...m, ...action.payload } : m
                );
            })
            /* content export */
            .addCase(fetchExportPostTypes.pending, (state) => {
                state.exportPostTypesStatus = "loading";
            })
            .addCase(fetchExportPostTypes.fulfilled, (state, action) => {
                state.exportPostTypesStatus = "idle";
                state.exportPostTypes = Array.isArray(action.payload) ? action.payload : [];
            })
            .addCase(fetchExportPostTypes.rejected, (state) => {
                state.exportPostTypesStatus = "idle";
            })
            .addCase(startContentExport.pending, (state) => {
                state.exportStarting = true;
                state.exportJob = null;
            })
            .addCase(startContentExport.fulfilled, (state, action) => {
                state.exportStarting = false;
                state.exportJob = action.payload ?? null;
            })
            .addCase(startContentExport.rejected, (state) => {
                state.exportStarting = false;
            })
            .addCase(pollExportStatus.fulfilled, (state, action) => {
                if (action.payload) {
                    state.exportJob = action.payload;
                }
            })
            .addCase(fetchActiveExportJob.fulfilled, (state, action) => {
                if (action.payload) {
                    state.exportJob = action.payload;
                }
            })
            .addCase(cancelContentExport.fulfilled, (state) => {
                state.exportJob = null;
            })
            .addCase(uploadExportToOpenAi.pending, (state) => {
                state.exportUploading = true;
            })
            .addCase(uploadExportToOpenAi.fulfilled, (state) => {
                state.exportUploading = false;
                state.exportJob = null;
            })
            .addCase(uploadExportToOpenAi.rejected, (state) => {
                state.exportUploading = false;
            })
            .addCase(fetchExportHistory.fulfilled, (state, action) => {
                state.exportHistory = action.payload;
            })
            /* website crawler */
            .addCase(fetchActiveKbCrawl.fulfilled, (state, action) => {
                state.kbCrawlJob = action.payload ?? null;
            })
            .addCase(startKbCrawl.pending, (state) => {
                state.kbCrawlStarting = true;
                state.kbCrawlPreview = { rows: [], total: 0, status: "idle" };
            })
            .addCase(startKbCrawl.fulfilled, (state, action) => {
                state.kbCrawlStarting = false;
                state.kbCrawlJob = action.payload ?? null;
            })
            .addCase(startKbCrawl.rejected, (state) => {
                state.kbCrawlStarting = false;
            })
            .addCase(pollKbCrawl.fulfilled, (state, action) => {
                state.kbCrawlJob = action.payload ?? null;
            })
            .addCase(cancelKbCrawl.fulfilled, (state) => {
                state.kbCrawlJob = null;
                state.kbCrawlPreview = { rows: [], total: 0, status: "idle" };
            })
            .addCase(uploadKbCrawl.pending, (state) => {
                state.kbCrawlUploading = true;
            })
            .addCase(uploadKbCrawl.fulfilled, (state) => {
                state.kbCrawlUploading = false;
                state.kbCrawlJob = null;
                state.kbCrawlPreview = { rows: [], total: 0, status: "idle" };
            })
            .addCase(uploadKbCrawl.rejected, (state) => {
                state.kbCrawlUploading = false;
            })
            .addCase(fetchKbCrawlHistory.fulfilled, (state, action) => {
                state.kbCrawlHistory = action.payload;
            })
            .addCase(clearKbCrawlHistory.fulfilled, (state) => {
                state.kbCrawlHistory = [];
            })
            .addCase(fetchKbCrawlPreview.pending, (state) => {
                state.kbCrawlPreview.status = "loading";
            })
            .addCase(fetchKbCrawlPreview.fulfilled, (state, action) => {
                state.kbCrawlPreview.status = "idle";
                state.kbCrawlPreview.rows = action.payload?.rows ?? [];
                state.kbCrawlPreview.total = action.payload?.total ?? 0;
            })
            .addCase(fetchKbCrawlPreview.rejected, (state) => {
                state.kbCrawlPreview.status = "idle";
            })
            .addCase(fetchKbCrawlSchedule.fulfilled, (state, action) => {
                state.kbCrawlSchedules = action.payload ?? [];
            })
            .addCase(addKbCrawlSchedule.pending, (state) => {
                state.kbCrawlScheduleSaving = true;
            })
            .addCase(addKbCrawlSchedule.fulfilled, (state, action) => {
                state.kbCrawlScheduleSaving = false;
                if (action.payload) state.kbCrawlSchedules.unshift(action.payload);
            })
            .addCase(addKbCrawlSchedule.rejected, (state) => {
                state.kbCrawlScheduleSaving = false;
            })
            .addCase(updateKbCrawlSchedule.pending, (state) => {
                state.kbCrawlScheduleSaving = true;
            })
            .addCase(updateKbCrawlSchedule.fulfilled, (state, action) => {
                state.kbCrawlScheduleSaving = false;
                const idx = state.kbCrawlSchedules.findIndex((s) => s.id === action.payload?.id);
                if (idx !== -1 && action.payload) state.kbCrawlSchedules[idx] = action.payload;
            })
            .addCase(updateKbCrawlSchedule.rejected, (state) => {
                state.kbCrawlScheduleSaving = false;
            })
            .addCase(toggleKbCrawlSchedule.fulfilled, (state, action) => {
                const idx = state.kbCrawlSchedules.findIndex((s) => s.id === action.payload?.id);
                if (idx !== -1 && action.payload) state.kbCrawlSchedules[idx] = action.payload;
            })
            .addCase(deleteKbCrawlSchedule.fulfilled, (state, action) => {
                state.kbCrawlSchedules = state.kbCrawlSchedules.filter((s) => s.id !== action.payload);
            });
    },
});

export const { clearSelectedAgent } = aiAgentSlice.actions;
export default aiAgentSlice.reducer;
