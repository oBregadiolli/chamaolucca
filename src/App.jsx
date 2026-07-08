import { useState, useEffect, startTransition, lazy, Suspense } from 'react';
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

// Admin (code-split — reduz chunk principal da loja)
import AdminGuard from './admin/AdminGuard';
import AdminLayout from './admin/AdminLayout';
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard'));
const AdminOrders    = lazy(() => import('./admin/pages/AdminOrders'));
const AdminCustomers = lazy(() => import('./admin/pages/AdminCustomers'));
const AdminProducts  = lazy(() => import('./admin/pages/AdminProducts'));
const AdminCategories = lazy(() => import('./admin/pages/AdminCategories'));
const AdminSettings = lazy(() => import('./admin/pages/AdminSettings'));
const AdminCoupons = lazy(() => import('./admin/pages/AdminCoupons'));
const AdminDeliveryExceptions = lazy(() => import('./admin/pages/AdminDeliveryExceptions'));
const AdminRoutes = lazy(() => import('./admin/pages/AdminRoutes'));
const AdminRouteDetail = lazy(() => import('./admin/pages/AdminRouteDetail'));
const AdminDrivers = lazy(() => import('./admin/pages/AdminDrivers'));
const AdminGeocoding = lazy(() => import('./admin/pages/AdminGeocoding'));

function AdminRouteFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
      <div className="spinner" />
    </div>
  );
}

function StorefrontLayout() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const openAuth = () => setAuthOpen(true);

  useEffect(() => {
    if (location.state?.authNotice) {
      const notice = location.state.authNotice;
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: {} },
      );
      startTransition(() => setAuthNotice(notice));
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
                <Route index element={<Suspense fallback={<AdminRouteFallback />}><AdminDashboard /></Suspense>} />
                <Route path="pedidos"   element={<Suspense fallback={<AdminRouteFallback />}><AdminOrders    /></Suspense>} />
                <Route path="clientes"  element={<Suspense fallback={<AdminRouteFallback />}><AdminCustomers /></Suspense>} />
                <Route path="produtos" element={<Suspense fallback={<AdminRouteFallback />}><AdminProducts /></Suspense>} />
                <Route path="categorias" element={<Suspense fallback={<AdminRouteFallback />}><AdminCategories /></Suspense>} />
                <Route path="configuracoes" element={<Suspense fallback={<AdminRouteFallback />}><AdminSettings /></Suspense>} />
                <Route path="cupons" element={<Suspense fallback={<AdminRouteFallback />}><AdminCoupons /></Suspense>} />
                <Route path="agenda" element={<Suspense fallback={<AdminRouteFallback />}><AdminDeliveryExceptions /></Suspense>} />
                <Route path="rotas" element={<Suspense fallback={<AdminRouteFallback />}><AdminRoutes /></Suspense>} />
                <Route path="rotas/:id" element={<Suspense fallback={<AdminRouteFallback />}><AdminRouteDetail /></Suspense>} />
                <Route path="entregadores" element={<Suspense fallback={<AdminRouteFallback />}><AdminDrivers /></Suspense>} />
                <Route path="geocodificacao" element={<Suspense fallback={<AdminRouteFallback />}><AdminGeocoding /></Suspense>} />
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
