import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

interface IHomePage {}

const initialState: IHomePage = {};

const homePageSlice = createSlice({
  name: "homePage",
  initialState,
  reducers: {},
  extraReducers: {},
});

export const {} = homePageSlice.actions;

export default homePageSlice;
