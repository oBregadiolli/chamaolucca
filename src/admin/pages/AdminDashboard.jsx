import { useEffect, useState } from 'react';
import { fetchOrderSummary } from '../services/adminOrders';
import { fetchAllProducts } from '../services/adminProducts';
import { fetchAllCategories } from '../services/adminCategories';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';

const STATUS_CONFIG = {
  received:  { label: 'Recebidos',   color: '#3b82f6', bg: '#eff6ff', icon: 'mark_email_unread' },
  preparing: { label: 'Preparando',  color: '#f59e0b', bg: '#fffbeb', icon: 'soup_kitchen'       },
  delivering:{ label: 'Entregando',  color: '#8b5cf6', bg: '#f5f3ff', icon: 'two_wheeler'        },
  delivered: { label: 'Entregues',   color: '#10b981', bg: '#ecfdf5', icon: 'check_circle'       },
  cancelled: { label: 'Cancelados',  color: '#ef4444', bg: '#fef2f2', icon: 'cancel'             },
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [productCount, setProductCount] = useState(null);
  const [categoryCount, setCategoryCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, products, categories] = await Promise.all([
          fetchOrderSummary(),
          fetchAllProducts(),
          fetchAllCategories(),
        ]);
        setSummary(s);
        setProductCount(products.length);
        setCategoryCount(categories.length);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="admin-loading">Carregando dashboard...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-subtitle">
          Visão geral do negócio em tempo real.
        </p>
      </div>

      {/* Summary cards */}
      <div className="admin-stat-grid">
        <div className="admin-stat-card admin-stat-card--primary">
          <div className="admin-stat-icon"><Icon name="package_2" size={28} fill /></div>
          <div className="admin-stat-value">{summary.total}</div>
          <div className="admin-stat-label">Total de Pedidos</div>
          <Link to="/admin/pedidos" className="admin-stat-link">Ver todos →</Link>
        </div>

        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div
            key={key}
            className="admin-stat-card"
            style={{ '--stat-color': cfg.color, '--stat-bg': cfg.bg }}
          >
            <div className="admin-stat-icon">
              <Icon name={cfg.icon} size={28} fill style={{ color: cfg.color }} />
            </div>
            <div className="admin-stat-value" style={{ color: cfg.color }}>
              {summary[key] ?? 0}
            </div>
            <div className="admin-stat-label">{cfg.label}</div>
          </div>
        ))}

        <div className="admin-stat-card">
          <div className="admin-stat-icon"><Icon name="inventory_2" size={28} fill /></div>
          <div className="admin-stat-value">{productCount}</div>
          <div className="admin-stat-label">Produtos</div>
          <Link to="/admin/produtos" className="admin-stat-link">Gerenciar →</Link>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon"><Icon name="label" size={28} fill /></div>
          <div className="admin-stat-value">{categoryCount}</div>
          <div className="admin-stat-label">Categorias</div>
          <Link to="/admin/categorias" className="admin-stat-link">Ver →</Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="admin-quick-actions">
        <h2 className="admin-section-title">Ações Rápidas</h2>
        <div className="admin-quick-grid">
          <Link to="/admin/pedidos" className="admin-quick-card">
            <span className="admin-quick-icon"><Icon name="package_2" size={22} fill /></span>
            <span>Ver Pedidos</span>
          </Link>
          <Link to="/admin/produtos" className="admin-quick-card">
            <span className="admin-quick-icon"><Icon name="add_circle" size={22} fill /></span>
            <span>Adicionar Produto</span>
          </Link>
          <Link to="/admin/categorias" className="admin-quick-card">
            <span className="admin-quick-icon"><Icon name="label" size={22} fill /></span>
            <span>Categorias</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
