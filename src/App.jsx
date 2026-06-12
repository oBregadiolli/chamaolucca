import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useOutletContext, useLocation, useNavigate } from 'react-router-dom';
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
import LegacyPasswordResetRedirect from './pages/LegacyPasswordResetRedirect';

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

function StorefrontLayout() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const openAuth = () => setAuthOpen(true);

  useEffect(() => {
    if (location.state?.authNotice) {
      setAuthNotice(location.state.authNotice);
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: {} },
      );
    }
  }, [location.state, location.pathname, location.search, navigate]);

  return (
    <>
      <Header onOpenAuth={openAuth} />

      {authNotice && (
        <div className="container" style={{ paddingTop: 12 }}>
          <div className="feedback-banner feedback-banner--info" role="status">
            <span style={{ flex: 1 }}>{authNotice}</span>
            <button
              type="button"
              className="auth-close"
              onClick={() => setAuthNotice(null)}
              aria-label="Fechar aviso"
              style={{ position: 'static', marginLeft: 8 }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      <CartPanel onOpenAuth={openAuth} />
      <MobileCartBar />

      <main>
        <Outlet context={{ openAuth }} />
      </main>

      <Footer />
    </>
  );
}

function StorePage() {
  const { openAuth } = useOutletContext();
  return <Store onOpenAuth={openAuth} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <StoreProvider>
            <Routes>
              <Route
                path="/admin/*"
                element={
                  <AdminGuard>
                    <AdminLayout />
                  </AdminGuard>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="pedidos" element={<AdminOrders />} />
                <Route path="produtos" element={<AdminProducts />} />
                <Route path="categorias" element={<AdminCategories />} />
                <Route path="configuracoes" element={<AdminSettings />} />
                <Route path="cupons" element={<AdminCoupons />} />
                <Route path="agenda" element={<AdminDeliveryExceptions />} />
                <Route path="rotas" element={<AdminRoutes />} />
                <Route path="rotas/:id" element={<AdminRouteDetail />} />
                <Route path="entregadores" element={<AdminDrivers />} />
                <Route path="geocodificacao" element={<AdminGeocoding />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route element={<StorefrontLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/loja" element={<StorePage />} />
                <Route path="/perfil" element={<Profile />} />
                <Route path="/redefinir-senha" element={<LegacyPasswordResetRedirect />} />
                <Route path="/termos" element={<Terms />} />
                <Route path="/privacidade" element={<Privacy />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/pedido/:id" element={<OrderConfirmation />} />
                <Route path="/item/:productId" element={<ProductDetail />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </StoreProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
