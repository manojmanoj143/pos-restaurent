import { createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

const initialState = {
    user: null,
    session: null,
    posProfile: null,
    allowedItemGroups: [],
    allowedCustomerGroups: [],
    filteredItems: [],
    filteredCustomers: []
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const { user, session, pos_profile, message } = action.payload;

      state.user = user;
      state.session = session;
      state.posProfile = pos_profile;
      state.allowedItemGroups = message?.allowed_item_groups || [];
      state.allowedCustomerGroups = message?.allowed_customer_groups || [];
      state.filteredItems = message?.filtered_items || [];
      state.filteredCustomers = message?.filtered_customers || [];
    },
    logout: (state) => {
      return initialState;
    },
  },
});

export const { loginSuccess, logout } = userSlice.actions;

const persistConfig = {
  key: "user",
  storage,
};

export default persistReducer(persistConfig, userSlice.reducer);
