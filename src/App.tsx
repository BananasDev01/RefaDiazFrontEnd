import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import theme from './theme'
import { SnackbarProvider } from './contexts/SnackbarContext'
import { MobileProvider } from './contexts/MobileProvider'
import { Login } from './pages/Login'
import { AuthGuard } from './components/AuthGuard'
import { Dashboard } from './pages/Dashboard'
import Providers from './pages/Providers'
import ProductTypeSelection from './pages/Products/ProductTypeSelection'
import ProductCatalog from './pages/Products/ProductCatalog'
import ProductFormPage from './pages/Products/ProductFormPage'
import Admin from './pages/Admin'
import Brands from './pages/Brands'
import Users from './pages/Users'
import VehicleNotesCatalog from './pages/VehicleNotes/VehicleNotesCatalog'
import VehicleNoteFormPage from './pages/VehicleNotes/VehicleNoteFormPage'
import VehicleNoteDetailPage from './pages/VehicleNotes/VehicleNoteDetailPage'
import ClientsPage from './pages/Clients/ClientsPage'
import DocumentUploadPage from './pages/ServiceOrders/DocumentUploadPage'
import { ServiceOrdersPage } from './pages/ServiceOrders/ServiceOrdersPage'
import { NewServiceOrderPage, ServiceOrderEditorPage } from './pages/ServiceOrders/ServiceOrderPages'
import { ClientDetailPage } from './pages/Clients/ClientDetailPage'

// Crear instancia de QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
    },
  },
})

// Componente principal con todos los proveedores
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <SnackbarProvider>
          <MobileProvider>
            <CssBaseline />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/document-upload" element={<DocumentUploadPage />} />
                <Route
                  path="/"
                  element={
                    <AuthGuard>
                      <Dashboard />
                    </AuthGuard>
                  }
                >
                  <Route index element={<Navigate to="/service-orders" replace />} />
                  <Route path="products">
                    <Route index element={<ProductTypeSelection />} />
                    <Route path=":productType/new" element={<ProductFormPage />} />
                    <Route path=":productType/edit/:productId" element={<ProductFormPage />} />
                    <Route path=":productType/*" element={<ProductCatalog />} />
                  </Route>
                  <Route path="providers" element={<Providers />} />
                  <Route path="clients">
                    <Route index element={<ClientsPage />} />
                    <Route path=":clientId" element={<ClientDetailPage />} />
                  </Route>
                  <Route path="service-orders">
                    <Route index element={<ServiceOrdersPage />} />
                    <Route path="new" element={<NewServiceOrderPage />} />
                    <Route path=":serviceExternalId" element={<ServiceOrderEditorPage />} />
                  </Route>
                  <Route path="admin">
                    <Route index element={<Admin />} />
                    <Route path="users" element={<Users />} />
                    <Route path="brands" element={<Brands />} />
                  </Route>
                  <Route path="users" element={<Navigate to="/admin/users" replace />} />
                  <Route path="vehicle-notes">
                    <Route index element={<VehicleNotesCatalog />} />
                    <Route path="new" element={<VehicleNoteFormPage />} />
                    <Route path=":noteId" element={<VehicleNoteDetailPage />} />
                    <Route path="edit/:noteId" element={<VehicleNoteFormPage />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </MobileProvider>
        </SnackbarProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
