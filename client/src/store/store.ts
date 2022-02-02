import { configureStore } from "@reduxjs/toolkit";
import homePageSlice from "./reducer/homePageSlice";

const store = configureStore({
  reducer: {
    homePage: homePageSlice.reducer,
  },
});

export default store;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
