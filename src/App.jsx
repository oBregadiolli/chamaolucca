import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { StoreProvider } from './context/StoreContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import AuthModal from './components/auth/AuthModal';
import CartPanel from './components/cart/CartPanel';
import MobileCartBar from './components/cart/MobileCartBar';
import Home from './pages/Home';
import Store from './pages/Store';
import Profile from './pages/Profile';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import ProductDetail from './pages/ProductDetail';
import NotFound from './pages/NotFound';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import ResetPassword from './pages/ResetPassword';

// Admin
import AdminGuard from './admin/AdminGuard';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminOrders from './admin/pages/AdminOrders';
import AdminProducts from './admin/pages/AdminProducts';
import AdminCategories from './admin/pages/AdminCategories';
import AdminSettings from './admin/pages/AdminSettings';
import AdminCoupons from './admin/pages/AdminCoupons';
import AdminDeliveryExceptions from './admin/pages/AdminDeliveryExceptions';
import AdminRoutes from './admin/pages/AdminRoutes';
import AdminRouteDetail from './admin/pages/AdminRouteDetail';
import AdminDrivers from './admin/pages/AdminDrivers';
import AdminGeocoding from './admin/pages/AdminGeocoding';

export default function App() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <StoreProvider>
            <Routes>
              {/* ── Admin routes (no Header/Footer) ── */}
              <Route
                path="/admin/*"
                element={
                  <AdminGuard>
                    <AdminLayout />
                  </AdminGuard>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="pedidos"        element={<AdminOrders />} />
                <Route path="produtos"       element={<AdminProducts />} />
                <Route path="categorias"     element={<AdminCategories />} />
                <Route path="configuracoes"  element={<AdminSettings />} />
                <Route path="cupons"         element={<AdminCoupons />} />
                <Route path="agenda"         element={<AdminDeliveryExceptions />} />
                <Route path="rotas"          element={<AdminRoutes />} />
                <Route path="rotas/:id"       element={<AdminRouteDetail />} />
                <Route path="entregadores"     element={<AdminDrivers />} />
                <Route path="geocodificacao" element={<AdminGeocoding />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* ── Storefront routes ── */}
              <Route
                path="/*"
                element={
                  <>
                    <Header onOpenAuth={() => setAuthOpen(true)} />

                    {authOpen && (
                      <AuthModal onClose={() => setAuthOpen(false)} />
                    )}

                    <CartPanel onOpenAuth={() => setAuthOpen(true)} />
                    <MobileCartBar />

                    <main>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route
                          path="/loja"
                          element={<Store onOpenAuth={() => setAuthOpen(true)} />}
                        />
                        <Route path="/perfil" element={<Profile />} />
                        <Route path="/redefinir-senha" element={<ResetPassword />} />
                        <Route path="/termos" element={<Terms />} />
                        <Route path="/privacidade" element={<Privacy />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/pedido/:id" element={<OrderConfirmation />} />
                        <Route path="/item/:productId" element={<ProductDetail />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>

                    <Footer />
                  </>
                }
              />
            </Routes>
          </StoreProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
