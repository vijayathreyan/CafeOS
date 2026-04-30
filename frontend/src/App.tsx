import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Coffee } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import ProtectedRoute from './components/ProtectedRoute'
import { Toaster } from './components/ui/toaster'
import Layout from './components/Layout'
import Login from './pages/Login'
import BranchSelect from './pages/BranchSelect'
import StaffDashboard from './pages/staff/StaffDashboard'
import ShiftDashboard from './pages/staff/ShiftDashboard'
import OwnerDashboard from './pages/owner/OwnerDashboard'
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard'
import UserManagement from './pages/owner/UserManagement'
import EmployeeOnboarding from './pages/owner/EmployeeOnboarding'
import TaskInbox from './pages/shared/TaskInbox'
import StockEntry from './pages/staff/StockEntry'
import ExpenseEntry from './pages/staff/ExpenseEntry'
import SupervisorEntry from './pages/supervisor/SupervisorEntry'
import AdminSettings from './pages/owner/AdminSettings'
import StockConfig from './pages/owner/StockConfig'
import VendorMaster from './pages/owner/VendorMaster'
import VendorOnboarding from './pages/owner/VendorOnboarding'
import VendorProfile from './pages/owner/VendorProfile'
import ItemMasterPage from './pages/owner/ItemMasterPage'
// Phase 4 — Owner Entry Modules & Expenses
import DataEntryHub from './pages/owner/DataEntryHub'
import UPIEntryPage from './pages/owner/UPIEntryPage'
import DeliveryPayoutsPage from './pages/owner/DeliveryPayoutsPage'
import SalaryEntryPage from './pages/owner/SalaryEntryPage'
import OwnerExpensesHub from './pages/owner/OwnerExpensesHub'
import OwnerHOExpensesPage from './pages/owner/OwnerHOExpensesPage'
import ManualExpensesPage from './pages/owner/ManualExpensesPage'
import OwnerDepositsPage from './pages/owner/OwnerDepositsPage'
import VasanthFloatPage from './pages/owner/VasanthFloatPage'
// Phase 9 — Sales Reconciliation + Cash Discrepancy + Supervisor Float rename
import ReconciliationReport from './pages/reports/ReconciliationReport'
import CashDiscrepancyReport from './pages/reports/CashDiscrepancyReport'
import ShiftCashReport from './pages/reports/ShiftCashReport'
import CashDepositPage from './pages/supervisor/CashDepositPage'
import SupervisorExpensesPage from './pages/supervisor/SupervisorExpensesPage'
// Phase 5 — Vendor Payments & Post-Paid Customers
import VendorPaymentsPage from './pages/owner/VendorPaymentsPage'
import PostPaidCustomersPage from './pages/owner/PostPaidCustomersPage'
// Phase 6 — Month End Closing Stock
import MonthEndStockPage from './pages/owner/MonthEndStockPage'
import MonthEndStockHistoryPage from './pages/owner/MonthEndStockHistoryPage'
// Phase 7 — Reports Hub + individual reports
import ReportsHub from './pages/owner/ReportsHub'
import MilkReport from './pages/owner/reports/MilkReport'
import ConsumptionReport from './pages/owner/reports/ConsumptionReport'
import WastageReport from './pages/owner/reports/WastageReport'
import ExpenseReport from './pages/owner/reports/ExpenseReport'
// Phase 8 — P&L Report + Daily Sales Summary
import PLReport from './pages/reports/PLReport'
import DailySalesSummary from './pages/reports/DailySalesSummary'

function AuthLoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
      <div className="flex items-center gap-2 mb-2">
        <Coffee className="h-8 w-8 text-primary" />
        <span className="text-2xl font-semibold text-foreground">CafeOS</span>
      </div>
      <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-loading w-1/3" />
      </div>
      <p className="text-sm text-muted-foreground">Unlimited Food Works</p>
    </div>
  )
}

/**
 * Global loading gate — blocks all page rendering until AuthContext.loading is false.
 * loading becomes false only after fetchEmployee() completes (or the 3s fallback fires),
 * so no page ever mounts with user=null due to an in-flight session check.
 */
function AppRouter() {
  const { loading } = useAuth()

  if (loading) {
    return <AuthLoadingScreen />
  }

  return (
    <Routes>
      {/* /login: Login.tsx's useEffect handles redirect when user is already authenticated.
              Removing the session-based Navigate here prevents a race where App.tsx sets
              session before AuthContext finishes fetchEmployee, causing a redirect loop. */}
      <Route path="/login" element={<Login />} />

      <Route
        path="/branch-select"
        element={
          <ProtectedRoute>
            <BranchSelect />
          </ProtectedRoute>
        }
      />

      {/* Protected layout routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* / → redirect to role-specific dashboard */}
        <Route path="/" element={<RoleHome />} />

        {/* Role-specific home routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff-dashboard"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supervisor-dashboard"
          element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <SupervisorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shift"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <ShiftDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/supervisor-shift"
          element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <ShiftDashboard />
            </ProtectedRoute>
          }
        />

        {/* Phase 2 — Stock & Expense Entry (Staff) */}
        <Route
          path="/stock-entry"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StockEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expense-entry"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <ExpenseEntry />
            </ProtectedRoute>
          }
        />

        {/* Phase 2 — Supervisor Data Entry (both branches) */}
        <Route
          path="/supervisor-entry"
          element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <SupervisorEntry />
            </ProtectedRoute>
          }
        />

        {/* Phase 7 — Reports Hub */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <ReportsHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/reports/milk"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <MilkReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/reports/consumption"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <ConsumptionReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/reports/wastage"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <WastageReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/reports/expenses"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <ExpenseReport />
            </ProtectedRoute>
          }
        />

        {/* Phase 8 — P&L Report + Daily Sales Summary */}
        <Route
          path="/reports/pl"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <PLReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/daily-sales"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <DailySalesSummary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <AdminSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/stock-config"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <StockConfig />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <EmployeeOnboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <EmployeeOnboarding />
            </ProtectedRoute>
          }
        />

        <Route path="/tasks" element={<TaskInbox />} />

        {/* Phase 3 — Vendor Onboarding & Master (Owner) */}
        <Route
          path="/vendors"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <VendorMaster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors/new"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <VendorOnboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors/:id"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <VendorProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <VendorOnboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/items"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <ItemMasterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/item-master"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <ItemMasterPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 4 — Owner Entry Modules */}
        <Route
          path="/owner/data-entry"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <DataEntryHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/upi-entry"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <UPIEntryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/delivery-payouts"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <DeliveryPayoutsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/salary-entry"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <SalaryEntryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/expenses"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <OwnerExpensesHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/ho-expenses"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <OwnerHOExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/manual-expenses"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <ManualExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/deposits"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <OwnerDepositsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/vasanth-float"
          element={<Navigate to="/owner/supervisor-float" replace />}
        />
        <Route
          path="/owner/supervisor-float"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <VasanthFloatPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 5 — Vendor Payments & Post-Paid Customers */}
        <Route
          path="/owner/vendor-payments"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <VendorPaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/postpaid-customers"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <PostPaidCustomersPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 6 — Month End Closing Stock */}
        <Route
          path="/staff/month-end-stock"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <MonthEndStockPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supervisor/month-end-stock"
          element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <MonthEndStockPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/reports/month-end-stock"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <MonthEndStockHistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 9 — Sales Reconciliation + Cash Discrepancy */}
        <Route
          path="/reports/reconciliation"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <ReconciliationReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/cash-discrepancy"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <CashDiscrepancyReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/shift-cash"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <ShiftCashReport />
            </ProtectedRoute>
          }
        />

        {/* Phase 4 — Supervisor Modules */}
        <Route
          path="/supervisor/cash-deposit"
          element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <CashDepositPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supervisor/expenses"
          element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <SupervisorExpensesPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Toaster />
        <AppRouter />
      </LanguageProvider>
    </AuthProvider>
  )
}

// Bug 1/2: redirect to role-specific dashboard. Never renders a blank page.
// Unknown role falls back to /login with the auth context clearing the session.
function RoleHome() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'owner') return <Navigate to="/dashboard" replace />
  if (user.role === 'supervisor') return <Navigate to="/supervisor-dashboard" replace />
  if (user.role === 'staff') return <Navigate to="/staff-dashboard" replace />
  return <Navigate to="/login" replace />
}
