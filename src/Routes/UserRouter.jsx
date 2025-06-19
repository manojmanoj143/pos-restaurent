import React from "react";
import { Route, Routes } from "react-router-dom";

// Import Pages
import TablePage from "../Pages/TablePage";
import FrontPage from "../Pages/FrontPage";
import KitchenRoomPage from "../Pages/KitchenRoomPage";
import BearerPage from "../Pages/BearerPage";
import CashPage from "../Pages/CashPage";
import CardPage from "../Pages/CardPage";
import SavedOrderPage from "../Pages/SavedOrderPage";
import SalesPage from "../Pages/SalesPage";

// Import Components
import FirstTab from "../components/FirstTab/FirstTab";
import AdminPage from "../components/admin/AdminPage";
import MainPage from "../components/Form/MainPage";
import CustomerListPage from "../components/Form/CustomerListPage";
import ItemListPage from "../components/Form/ItemListPage";
import CreateItemsPage from "../components/Form/CreateItemsPage";
import BearerLoginPage from "../components/BearerLoginPage";
import AddTablePage from "../components/Form/AddTablePage";
import RecordPage from "../components/Form/RecordPage";
import OpeningEntry from "../components/Bearer/OpeningEntry";
import ClosingEntry from "../components/Bearer/ClosingEntry";
import RegisterPage from "../components/Form/RegisterPage";
import BackupPage from "../components/Form/BackupsPage.";
import SystemSettings from "../components/Form/SystemSettings";
import ActiveOrders from "../components/Header/ActiveOrders";
import Dashboard from "../components/Dashboard";
import UserList from "../components/Form/UserList";
import AddKitchenPage from "../components/Form/AddKitchenPage";
import AddItemGroupPage from "../components/Form/AddItemGroupPage";
import AddingirdientAndNurion from "../components/Form/AddingirdientAndNurion";
import SalesReport from "../components/Navbar/SalesReport";
import Booking from "../components/Table/Booking";
import CreateVariant from "../components/Form/CreateVariant";
import Employee from "../components/Form/Employee";
import TripReport from "../components/Header/TripReport";
import PosBalance from "../components/Header/PosBalance";
import EmailSettings from "../components/Form/EmailSettings";

const UserRouter = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        {/* Authentication Routes */}
        <Route path="/" element={<BearerLoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Main Application Routes */}
        <Route path="/home" element={<FirstTab />} />
        <Route path="/table" element={<TablePage />} />
        <Route path="/frontpage" element={<FrontPage />} />
        <Route path="/kitchen" element={<KitchenRoomPage />} />
        <Route path="/bearer" element={<BearerPage />} />
        <Route path="/cash" element={<CashPage />} />
        <Route path="/card" element={<CardPage />} />
        <Route path="/savedorders" element={<SavedOrderPage />} />
        <Route path="/salespage" element={<SalesPage />} />

        {/* Admin and Management Routes */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/items" element={<ItemListPage />} />
        <Route path="/create-item" element={<CreateItemsPage />} />
        <Route path="/add-table" element={<AddTablePage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/opening-entry" element={<OpeningEntry />} />
        <Route path="/closing-entry" element={<ClosingEntry />} />

        {/* System Configuration Routes */}
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/system-settings" element={<SystemSettings />} />
        <Route path="/email-settings" element={<EmailSettings />} />

        {/* Operational Routes */}
        <Route path="/active-orders" element={<ActiveOrders />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<UserList />} />
        <Route path="/add-kitchen" element={<AddKitchenPage />} />
        <Route path="/add-item-group" element={<AddItemGroupPage />} />
        <Route path="/add-ingredients-nutrition" element={<AddingirdientAndNurion />} />

        {/* Reporting Routes */}
        <Route path="/sales-reports" element={<SalesReport />} />
        <Route path="/trip-report" element={<TripReport />} />
        <Route path="/pos-balance" element={<PosBalance />} />

        {/* Additional Feature Routes */}
        <Route path="/booking" element={<Booking />} />
        <Route path="/create-variant" element={<CreateVariant />} />
        <Route path="/employees" element={<Employee />} />
      </Routes>
    </div>
  );
};

export default UserRouter;