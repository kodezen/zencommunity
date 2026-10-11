import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { __, sprintf } from "@wordpress/i18n";
import { API, current_logged_user, handleSliceError, handleSliceSuccess, namespace } from "@Utils/helper";
import moment from 'moment';

/**
 * Pure reaction state transition for a feed post. Returns a new post with the
 * updated react_type, is_liked, like_count and meta.reaction_count. Re-clicking
 * the same reactType toggles it off; a different type switches (decrement old,
 * increment new). Shared by the redux reducer and the group feed's optimistic
 * update so both stay consistent.
 */
export const applyReactionToPost = (post, reactType) => {
  const updatedMeta = { ...post.meta };
  const reactionCount = { ...updatedMeta.reaction_count };

  const isToggle = post.react_type === reactType;
  const newReactType = isToggle ? "" : reactType;
  const hadPreviousReaction = post.react_type && post.react_type !== "";

  if (reactType === "upvote" || reactType === "downvote") {
    const voteDelta = (type) => (type === "upvote" ? 1 : type === "downvote" ? -1 : 0);
    const newVoteScore =
      parseInt(post.vote_score || 0) -
      (hadPreviousReaction ? voteDelta(post.react_type) : 0) +
      (newReactType !== "" ? voteDelta(newReactType) : 0);

    return {
      ...post,
      react_type: newReactType,
      vote_score: newVoteScore,
    };
  }

  if (hadPreviousReaction) {
    const prevCount = parseInt(reactionCount[post.react_type] || 0);
    reactionCount[post.react_type] = String(Math.max(0, prevCount - 1));
  }

  if (newReactType !== "") {
    const newCount = parseInt(reactionCount[newReactType] || 0);
    reactionCount[newReactType] = String(newCount + 1);
  }

  let newLikeCount = parseInt(post.like_count || 0);
  if (isToggle) {
    newLikeCount = Math.max(0, newLikeCount - 1);
  } else if (!hadPreviousReaction) {
    newLikeCount = newLikeCount + 1;
  }

  return {
    ...post,
    is_liked: newReactType !== "",
    react_type: newReactType,
    like_count: newLikeCount,
    meta: {
      ...updatedMeta,
      reaction_count: reactionCount,
    },
  };
};

/**
 * Comments/replies form a tree via `parent_id` (a reply's parent can itself be
 * another reply, not just the top-level comment) - these walk that tree instead
 * of assuming replies are always one level deep under a top-level comment.
 */
const findCommentNode = (nodes, targetId) => {
  if (!Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (parseInt(node.id) === parseInt(targetId)) return node;
    const found = findCommentNode(node.replies, targetId);
    if (found) return found;
  }
  return null;
};

const removeCommentNode = (nodes, targetId) => {
  if (!Array.isArray(nodes)) return false;
  const index = nodes.findIndex((node) => parseInt(node.id) === parseInt(targetId));
  if (index !== -1) {
    nodes.splice(index, 1);
    return true;
  }
  return nodes.some((node) => removeCommentNode(node.replies, targetId));
};

export const fetchAllFeeds = createAsyncThunk("community/fetchAllFeeds", async ({page = 1, search="", order_by="", from_followers, bookmarked, status="", group_id }, thunkAPI) => {
  try {
    let url = `${namespace}/feeds`
    if (page) url+= `?page=${page}`
    if (search) url+= `&search=${encodeURIComponent(search)}`
    if (group_id) url+= `&group_id=${group_id}`
    if (order_by) url+= `&order_by=${order_by}`
    if (from_followers) url += `&from_followers=${from_followers}`;
    if (bookmarked) url += `&bookmarked=${bookmarked}`;
    // Explicit only — the backend's default (no status param) excludes
    // 'scheduled' posts so they don't leak into the public community feed;
    // callers that need to see them (e.g. the admin Posts screen) must ask
    // for a specific status.
    if (status) url += `&status=${status}`;

    const res = await API.get(url);
    return {
        data :res?.data?.records,
        page : res?.data.page,
        pages : res?.data.pages,
        per_page : res?.data.per_page,
        total : res?.data.total
    }
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const fetchSingleFeed = createAsyncThunk("community/fetchSingleFeed", async (id, thunkAPI) => {
  try {
    const response = await API.get(namespace + '/feed/' + parseInt(id));
    return response.data;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});


export const createFeedPost = createAsyncThunk("community/createFeedPost", async ({ group_id, formData }, thunkAPI) => {
     try {
      const res = await API.post(`${namespace}/group/${group_id}/feeds`,{ ...formData });
      if(formData.scheduled_at) {
        handleSliceSuccess(thunkAPI, sprintf(__("Your post has been scheduled for %s. Please find the scheduled post from your profile.", "zencommunity"), moment(formData.scheduled_at).local().format("MMMM D, YYYY hh:mm A")));
        return {...res.data, isSchedulePost: true}
      } else {
        handleSliceSuccess(thunkAPI, "Post Created successfully");
        return res.data;

      }
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
});

export const reactToFeedPost = createAsyncThunk(
  "community/reactToFeedPost",
  async ({feedId, reactType='like'}, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/feed/${feedId}/react/${reactType}`);
      return {feedId, reactType};
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const toggleBookmark = createAsyncThunk(
  "community/toggleBookmark",
  async ({ feedId }, thunkAPI) => {
    try {
      await API.post(`${namespace}/feed/${feedId}/react/bookmark`);
      return { feedId };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const deleteFeedPost = createAsyncThunk(
  "community/deleteFeedPost",
  async (feedId, thunkAPI) => {
    try {
      const res = await API.delete(`${namespace}/feed/${feedId}`);
        handleSliceSuccess(thunkAPI, "Post Deleted successfully");
      return feedId;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);
export const featureFeedPost = createAsyncThunk(
  "community/featureFeedPost",
  async ({ feedId }, thunkAPI) => {
    try {
      const { data } = await API.post(`${namespace}/feed/${feedId}/feature`);
      handleSliceSuccess(
        thunkAPI,
        Number(data?.is_featured) === 1
          ? "Post featured successfully"
          : "Post removed from featured successfully"
      );
      return data;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const approveFeedPost = createAsyncThunk(
  "community/approveFeedPost",
  async (feedId, thunkAPI) => {
    try {
      await API.post(`${namespace}/feed/${feedId}/approve`);
      return feedId;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const rejectFeedPost = createAsyncThunk(
  "community/rejectFeedPost",
  async (feedId, thunkAPI) => {
    try {
      await API.post(`${namespace}/feed/${feedId}/reject`);
      return feedId;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const votePoll = createAsyncThunk(
  "community/votePoll",
  async ({ feedId, optionIds }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/feed/${feedId}/poll/vote`, { option_ids: optionIds });
      return { feedId, poll: res.data.poll };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const removeVote = createAsyncThunk(
  "community/removeVote",
  async (feedId, thunkAPI) => {
    try {
      const res = await API.delete(`${namespace}/feed/${feedId}/poll/vote`);
      return { feedId, poll: res.data.poll };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const updateFeedPost = createAsyncThunk(
  "community/updateFeedPost",
  async ({ feedId, formData }, thunkAPI) => {
    try {
      const res = await API.put(`${namespace}/feed/${feedId}`, formData);
      if(formData.scheduled_at) {
        handleSliceSuccess(thunkAPI, sprintf(__("Your post has been re-scheduled at %s.", "zencommunity"), moment(formData.scheduled_at).local().format("MMMM D, YYYY hh:mm A")));
        return {...res.data, isSchedulePost: true}
      } else {
        return {
            data : res.data,
            feedId,
        };
      }
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

//comments 

export const postComment = createAsyncThunk(
  "community/postComment",
  async ({ feedId, commentText, mediaId, isAnonymous }, thunkAPI) => {
    try {
      const response = await API.post(`${namespace}/feed/${feedId}/comments`, {
        content: commentText,
        add_media_ids: mediaId,
        ...(isAnonymous ? { meta: { is_anonymous: true } } : {}),
      });
      handleSliceSuccess(thunkAPI, "Comment posted successfully");
      return {
        data: response.data,
        feedId,
      };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const updatePostedComment = createAsyncThunk(
  "community/updatePostedComment",
  async ({ feedId, commentId, commentText, mediaId, isAnonymous }, thunkAPI) => {
    try {
      const response = await API.put(`${namespace}/feed/${feedId}/comment/${commentId}`, {
        content: commentText,
        add_media_ids: mediaId,
        ...(isAnonymous !== undefined ? { meta: { is_anonymous: isAnonymous } } : {}),
      });
      handleSliceSuccess(thunkAPI, "Comment posted successfully");
      return {
        data: response.data,
        feedId,
        commentId,
      };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const deleteCommentReply = createAsyncThunk(
  "community/deleteCommentReply",
  async ({ feedId, commentId, parentId }, thunkAPI) => {
    try {
      await API.delete(`${namespace}/feed/${feedId}/comment/${commentId}`);
      handleSliceSuccess(thunkAPI, __("Comment Reply Deleted successfully","zencommunity"));
      return {
        feedId,
        commentId,
        parentId,
      };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const deleteComment = createAsyncThunk(
  "community/deleteComment",
  async ({ feedId, commentId }, thunkAPI) => {
    try {
      await API.delete(`${namespace}/feed/${feedId}/comment/${commentId}`);
      handleSliceSuccess(thunkAPI, __("Comment Deleted successfully","zencommunity"));
      return {
        feedId,
        commentId,
      };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);


export const getAllCommentsByFeed = createAsyncThunk(
  "community/getAllCommentsByFeed",
  async ({ feedId}, thunkAPI) => {
    try {
      const res = await API.get(`${namespace}/feed/${feedId}/comments`);
      return {
       data :  res?.data?.records,
       feedId,
    };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const getAllCommentReplies = createAsyncThunk(
  "feeds/fetchCommentReplies",
  async ({ feedId, commentParentId }, thunkAPI) => {
    try {
      const res = await API.get(`${namespace}/feed/${feedId}/comment/${commentParentId}`);
      return {
        feedId,
        commentParentId,
        replies: res?.data?.records,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const reactOnComment = createAsyncThunk(
  "community/reactOnComment",
  async ({ feedId, commentId, isParent, reactType='like' }, thunkAPI) => {
    try {
      const response = await API.post(`${namespace}/feed/${feedId}/comment/${commentId}/react/${reactType}`);
      return { feedId, commentId, isParent, reactType };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const postCommentReply = createAsyncThunk(
  "community/postCommentReply",
  async ({ feedId, commentParentId, content, mediaId, isAnonymous }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/feed/${feedId}/comment/${commentParentId}`,{
          content,
          add_media_ids: mediaId,
          ...(isAnonymous ? { meta: { is_anonymous: true } } : {}),
        }
      );
      return {
        feedId,
        commentParentId,
        reply: res.data,
      };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const updatePostCommentReply = createAsyncThunk(
  "community/updatePostCommentReply",
  async ({ feedId, id, content, mediaId, isAnonymous }, thunkAPI) => {
    try {
      const res = await API.put(`${namespace}/feed/${feedId}/comment/${id}`,{
          content,
          add_media_ids: mediaId,
          ...(isAnonymous !== undefined ? { meta: { is_anonymous: isAnonymous } } : {}),
        }
      );
      return {
        feedId,
        id,
        reply: res.data,
      };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

const feedSlice = createSlice({
  name: "feeds",
  initialState: {
    data: [],
    totalFeeds: null,
    perPageFeeds: null,
    currentPage: null,
    totalPages: null,
    comments: {}, // { [feedId]: comment[] }
  },
  reducers: {
    feedPostSocket: (state, action) => {
      const { message, ...rest } = action.payload;
      state.data = [{content: message, ...rest}, ...state.data];
    },
    feedPostLikeSocket: (state, action) => {
      state.data = state.data.map(item => {
        if(Number(item.id) === Number(action.payload)) {
          return {
            ...item,
            like_count: parseInt(item.like_count) + 1
          }
        }
        return item;
      });
    },
    feedPostCommentSocket: (state, action) => {
      // todo: if content is provided on socket will complete this state
    },
  },
  extraReducers: (builder) => {
    builder
    //feeds
      .addCase(fetchAllFeeds.fulfilled, (state, action) => {
        const {data, total, per_page, page, pages} = action.payload;
        // `replace: true` (e.g. numbered pagination in the admin Posts screen)
        // swaps the page in instead of the default infinite-scroll append —
        // opt-in via the thunk arg so the SPA's own "load more" callers are unaffected.
        const replace = action.meta?.arg?.replace;
        if (page > 1 && !replace) {
          state.data = [...state.data, ...data];
          state.totalFeeds = total;
          state.perPageFeeds = per_page;
          state.currentPage = page;
          state.totalPages = pages;
          return;
        }
        state.data = data;
        state.totalFeeds = total;
        state.perPageFeeds = per_page;
        state.currentPage = page;
        state.totalPages = pages;
      })
      .addCase(fetchSingleFeed.fulfilled, (state, action) => {
        state.data = [...state.data, action.payload];
      })
      .addCase(createFeedPost.pending, (state, action) => {
        const { group_id, formData } = action.meta.arg;
        // Scheduled posts never appear in the live feed - mirrors the
        // isSchedulePost skip in .fulfilled below.
        if (formData?.scheduled_at) return;
        const placeholder = {
          id: `temp_${action.meta.requestId}`,
          _client_id: action.meta.requestId,
          _status: "sending",
          group_id,
          user_id: current_logged_user?.user_id,
          user_first_name: current_logged_user?.first_name,
          user_last_name: current_logged_user?.last_name,
          user_avatar_url: current_logged_user?.avatar_url,
          user_usernames: current_logged_user?.username,
          group_name: "",
          title: formData?.title,
          content: formData?.content,
          rendered: formData?.content,
          type: formData?.type || "post",
          status: formData?.status || "published",
          react_type: "",
          is_liked: false,
          like_count: 0,
          comment_count: 0,
          is_bookmarked: false,
          is_locked: false,
          meta: formData?.meta || {},
          created_at: new Date().toISOString(),
        };
        state.data = [placeholder, ...state.data];
      })
      .addCase(createFeedPost.fulfilled, (state, action) => {
        if(action.payload.isSchedulePost) return;
        const requestId = action.meta.requestId;
        const hasPlaceholder = state.data.some((item) => item._client_id === requestId);
        state.data = hasPlaceholder
          ? state.data.map((item) => (item._client_id === requestId ? action.payload : item))
          : [action.payload, ...state.data];
      })
      .addCase(createFeedPost.rejected, (state, action) => {
        const requestId = action.meta.requestId;
        state.data = state.data.filter((item) => item._client_id !== requestId);
      })
      .addCase(deleteFeedPost.fulfilled, (state, action) => {
        state.data = state.data.filter(
          (feedItem) => parseInt(feedItem.id) !== action.payload
        );
      })
      .addCase(reactToFeedPost.fulfilled, (state, action) => {
        state.data = state.data.map((item) =>
          parseInt(item.id) === parseInt(action.payload.feedId)
            ? applyReactionToPost(item, action.payload.reactType)
            : item
        );
      })
      .addCase(toggleBookmark.fulfilled, (state, action) => {
        state.data = state.data.map((item) =>
          parseInt(item.id) === parseInt(action.payload.feedId)
            ? { ...item, is_bookmarked: !item.is_bookmarked }
            : item
        );
      })
      .addCase(updateFeedPost.fulfilled, (state, action) => {
        if(action.payload?.isSchedulePost) return;
        const { feedId, data } = action.payload;
        state.data = state.data.map((item) =>
          parseInt(item.id) === parseInt(feedId)
            ? { ...item, ...data, meta: { ...item.meta, ...(data.meta ?? {}) } }
            : item
        );
    })
      .addCase(featureFeedPost.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated?.id) return;
        state.data = state.data.map((item) =>
          parseInt(item.id) === parseInt(updated.id) ? { ...item, is_featured: updated.is_featured } : item
        );
      })
      .addCase(approveFeedPost.fulfilled, (state, action) => {
        state.data = state.data.map((item) =>
          parseInt(item.id) === parseInt(action.payload) ? { ...item, status: 'published' } : item
        );
      })
      .addCase(rejectFeedPost.fulfilled, (state, action) => {
        state.data = state.data.filter(
          (item) => parseInt(item.id) !== parseInt(action.payload)
        );
      })
      .addCase(votePoll.fulfilled, (state, action) => {
        const { feedId, poll } = action.payload;
        state.data = state.data.map((item) =>
          parseInt(item.id) === parseInt(feedId)
            ? { ...item, meta: { ...item.meta, poll: { ...item.meta?.poll, ...poll } } }
            : item
        );
      })
      .addCase(removeVote.fulfilled, (state, action) => {
        const { feedId, poll } = action.payload;
        state.data = state.data.map((item) =>
          parseInt(item.id) === parseInt(feedId)
            ? { ...item, meta: { ...item.meta, poll: { ...item.meta?.poll, ...poll } } }
            : item
        );
      })
    //comments
    .addCase(getAllCommentsByFeed.fulfilled, (state, action) => {
      // Keyed per post: set only this post's list. Replacing the whole map
      // wiped the comments of any other post that was already open.
      if (!state.comments || Array.isArray(state.comments)) state.comments = {};
      state.comments[action.payload.feedId] = action.payload.data;
    })
    .addCase(postComment.fulfilled, (state, action) => {
      state.comments[action.payload.feedId] = [...(state.comments[action.payload.feedId] || []), action.payload.data];
    })
    .addCase(updatePostedComment.fulfilled, (state, action) => {
      state.comments[action.payload.feedId] = [...state.comments[action.payload.feedId].map(item => {
        if(Number(item.id) === Number(action.payload.commentId)) {
          return {...item, ...action.payload.data, is_edited: true};
        }
        return item;
      })];
    })
    .addCase(deleteComment.fulfilled, (state, action) => {
      state.comments[action.payload.feedId] = [...state.comments[action.payload.feedId].filter(item => Number(item.id) !== Number(action.payload.commentId))];
    })
    .addCase(reactOnComment.fulfilled, (state, action) => {
      const { feedId, commentId, reactType } = action.payload;
      const node = findCommentNode(state.comments[feedId], commentId);
      if (node) {
        Object.assign(node, applyReactionToPost(node, reactType));
      }
    })
    .addCase(postCommentReply.fulfilled, (state, action) => {
      const { feedId, commentParentId, reply } = action.payload;
      const node = findCommentNode(state.comments[feedId], commentParentId);
      if (node) {
        node.replies = [...(node.replies || []), reply];
      }
    })
    .addCase(updatePostCommentReply.fulfilled, (state, action) => {
      const { feedId, id, reply } = action.payload;
      if (!Array.isArray(state.comments[feedId])) return;
      const node = findCommentNode(state.comments[feedId], id);
      if (node) {
        Object.assign(node, reply, { is_edited: true });
      }
    })
    .addCase(deleteCommentReply.fulfilled, (state, action) => {
      const { feedId, commentId } = action.payload;
      if (!Array.isArray(state.comments[feedId])) return;
      removeCommentNode(state.comments[feedId], commentId);
    })
    .addCase(getAllCommentReplies.fulfilled, (state, action) => {
      const { feedId, commentParentId, replies } = action.payload;
      const node = findCommentNode(state.comments[feedId], commentParentId);
      if (node) {
        node.replies = replies;
      }
  });

  },
});

export const { feedPostSocket, feedPostLikeSocket, feedPostCommentSocket } = feedSlice.actions;
export default feedSlice.reducer;