import { useEffect, useState } from 'react';
import {
  fetchAllCategories,
  createCategory,
  updateCategory,
  toggleCategoryActive,
} from '../services/adminCategories';
import Icon from '../../components/ui/Icon';

const EMPTY_CATEGORY = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
  sort_order: 0,
  active: true,
};

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function CategoryForm({ category, onSave, onCancel }) {
  const [form, setForm] = useState(category ?? EMPTY_CATEGORY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(field, value) {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'name' && !prev.id) {
        updated.slug = slugify(value);
      }
      return updated;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Nome é obrigatório.');
    if (!form.slug.trim()) return setError('Slug é obrigatório.');

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        active: form.active,
      };

      let saved;
      if (form.id) {
        saved = await updateCategory(form.id, payload);
      } else {
        saved = await createCategory(payload);
      }
      onSave(saved);
    } catch (err) {
      setError(err.message ?? 'Erro ao salvar categoria.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {form.id ? 'Editar Categoria' : 'Nova Categoria'}
          </h2>
          <button className="admin-modal-close" onClick={onCancel}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <form className="admin-modal-body" onSubmit={handleSubmit}>
          {error && (
            <div className="admin-feedback admin-feedback--error">{error}</div>
          )}

          <div className="admin-form-grid">
            <div className="admin-form-group admin-form-group--full">
              <label className="admin-form-label">Nome *</label>
              <input
                className="admin-form-input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ex: Frutas"
                required
              />
            </div>

            <div className="admin-form-group admin-form-group--full">
              <label className="admin-form-label">Slug *</label>
              <input
                className="admin-form-input"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder="ex: frutas"
                required
              />
            </div>

            <div className="admin-form-group admin-form-group--full">
              <label className="admin-form-label">Descrição</label>
              <input
                className="admin-form-input"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div className="admin-form-group admin-form-group--full">
              <label className="admin-form-label">URL da Imagem</label>
              <input
                className="admin-form-input"
                value={form.image_url}
                onChange={(e) => set('image_url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Ordem</label>
              <input
                className="admin-form-input"
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(e) => set('sort_order', e.target.value)}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-check">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => set('active', e.target.checked)}
                />
                Categoria ativa
              </label>
            </div>
          </div>

          <div className="admin-modal-footer">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={onCancel}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Salvando...' : form.id ? 'Salvar' : 'Criar Categoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAllCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(category) {
    try {
      const updated = await toggleCategoryActive(category.id, !category.active);
      setCategories((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, active: updated.active } : c))
      );
    } catch (err) {
      console.error(err);
    }
  }

  function handleSave(saved) {
    setCategories((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      if (exists) return prev.map((c) => (c.id === saved.id ? { ...c, ...saved } : c));
      return [...prev, saved].sort((a, b) => a.sort_order - b.sort_order);
    });
    setEditing(null);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Categorias</h1>
          <p className="admin-page-subtitle">{categories.length} categoria(s)</p>
        </div>
        <button
          className="admin-btn admin-btn--primary"
          onClick={() => setEditing('new')}
        >
          + Nova Categoria
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">Carregando categorias...</div>
      ) : categories.length === 0 ? (
        <div className="admin-empty">Nenhuma categoria encontrada.</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ordem</th>
                <th>Categoria</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr
                  key={cat.id}
                  className={!cat.active ? 'admin-row--inactive' : ''}
                >
                  <td className="admin-table-num">{cat.sort_order}</td>
                  <td>
                    <div className="admin-category-cell">
                      {cat.image_url && (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="admin-category-img"
                        />
                      )}
                      <div>
                        <div className="admin-table-name">{cat.name}</div>
                        {cat.description && (
                          <div className="admin-table-sub">{cat.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <code className="admin-slug">{cat.slug}</code>
                  </td>
                  <td>
                    <span
                      className="admin-badge"
                      style={
                        cat.active
                          ? { background: '#ecfdf5', color: '#10b981' }
                          : { background: '#f3f4f6', color: '#6b7280' }
                      }
                    >
                      {cat.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-action-group">
                      <button
                        className="admin-btn-icon"
                        onClick={() => setEditing(cat)}
                        title="Editar"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                      <button
                        className={`admin-btn-icon ${cat.active ? 'admin-btn-icon--warn' : 'admin-btn-icon--ok'}`}
                        onClick={() => handleToggle(cat)}
                        title={cat.active ? 'Desativar' : 'Reativar'}
                      >
                        <Icon name={cat.active ? 'block' : 'check_circle'} size={18} fill />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CategoryForm
          category={editing === 'new' ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
