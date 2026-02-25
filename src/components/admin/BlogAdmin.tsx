
import React, { useState, useEffect } from 'react';
import { BlogPost, User } from '../../types';
import {
  getAllBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  generateSlug,
  BLOG_CATEGORIES
} from '../../services/blogService';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  ArrowLeft,
  FileText,
  Calendar,
  Tag,
  Image,
  Loader2,
  Search,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BlogAdminProps {
  user: User;
}

const BlogAdmin: React.FC<BlogAdminProps> = ({ user }) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: '',
    excerpt: '',
    content: '',
    category: 'conseils',
    tags: [],
    author: user.firstName || 'Admin',
    isPublished: false,
    coverImage: '',
    seoTitle: '',
    seoDescription: ''
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const allPosts = await getAllBlogPosts(false); // Include drafts
      setPosts(allPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData(post);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      category: 'conseils',
      tags: [],
      author: user.firstName || 'Admin',
      isPublished: false,
      coverImage: '',
      seoTitle: '',
      seoDescription: ''
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      alert('Le titre et le contenu sont obligatoires');
      return;
    }

    setSaving(true);
    try {
      if (editingPost) {
        await updateBlogPost(editingPost.id, formData);
      } else {
        await createBlogPost(formData as Omit<BlogPost, 'id'>);
      }
      await loadPosts();
      setEditingPost(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return;

    try {
      await deleteBlogPost(id);
      await loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      await updateBlogPost(post.id, { isPublished: !post.isPublished });
      await loadPosts();
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }));
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Editor View
  if (isCreating || editingPost) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => { setEditingPost(null); setIsCreating(false); }}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={20} />
              Retour
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              {editingPost ? 'Modifier l\'article' : 'Nouvel article'}
            </h1>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Enregistrer
            </button>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Titre *</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value, slug: generateSlug(e.target.value) }))}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
                placeholder="Comment préparer son premier marathon"
              />
              <p className="text-xs text-slate-400 mt-1">Slug: {formData.slug || generateSlug(formData.title || '')}</p>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Résumé (extrait)</label>
              <textarea
                value={formData.excerpt || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none h-20"
                placeholder="Court résumé pour le listing des articles..."
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Contenu *</label>
              <textarea
                value={formData.content || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none h-64 font-mono text-sm"
                placeholder="Contenu de l'article (supporte le HTML basique)..."
              />
              <p className="text-xs text-slate-400 mt-1">Utilisez du HTML pour le formatage (h2, p, strong, em, ul, li...)</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Catégorie</label>
                <select
                  value={formData.category || 'conseils'}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as BlogPost['category'] }))}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
                >
                  {BLOG_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Image de couverture (URL)</label>
                <input
                  type="url"
                  value={formData.coverImage || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tags</label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {formData.tags?.map(tag => (
                  <span key={tag} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
                  placeholder="Ajouter un tag..."
                />
                <button onClick={addTag} className="bg-slate-100 px-4 rounded-xl hover:bg-slate-200">
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* SEO */}
            <div className="border-t pt-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Search size={18} /> SEO (Référencement)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Titre SEO</label>
                  <input
                    type="text"
                    value={formData.seoTitle || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
                    placeholder="Titre pour Google (60 caractères max)"
                    maxLength={60}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Meta Description</label>
                  <textarea
                    value={formData.seoDescription || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none h-20"
                    placeholder="Description pour Google (160 caractères max)"
                    maxLength={160}
                  />
                </div>
              </div>
            </div>

            {/* Publish Toggle */}
            <div className="flex items-center justify-between border-t pt-6">
              <div>
                <span className="font-bold text-slate-900">Publier l'article</span>
                <p className="text-sm text-slate-500">L'article sera visible sur le blog public</p>
              </div>
              <button
                onClick={() => setFormData(prev => ({ ...prev, isPublished: !prev.isPublished }))}
                className={`w-14 h-8 rounded-full transition-colors ${formData.isPublished ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${formData.isPublished ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-2"
            >
              <ArrowLeft size={18} />
              Retour au dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-900">Gestion du Blog</h1>
            <p className="text-slate-500">Créez et gérez vos articles pour le référencement</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 shadow-lg"
          >
            <Plus size={20} />
            Nouvel article
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un article..."
              className="w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
            />
          </div>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-accent" size={40} />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Aucun article</h3>
            <p className="text-slate-500 mb-4">Commencez par créer votre premier article de blog</p>
            <button onClick={handleCreate} className="text-accent font-bold hover:underline">
              Créer un article
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map(post => (
              <div
                key={post.id}
                className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 flex-1">
                  {post.coverImage ? (
                    <img src={post.coverImage} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center">
                      <FileText className="text-slate-400" size={24} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 truncate">{post.title}</h3>
                      {!post.isPublished && (
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">Brouillon</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Tag size={14} />
                        {BLOG_CATEGORIES.find(c => c.value === post.category)?.label || post.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(post.publishedAt).toLocaleDateString()}
                      </span>
                      {post.readingTime && <span>{post.readingTime} min de lecture</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePublish(post)}
                    className={`p-2 rounded-lg transition-colors ${post.isPublished ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                    title={post.isPublished ? 'Dépublier' : 'Publier'}
                  >
                    {post.isPublished ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                  <button
                    onClick={() => handleEdit(post)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-3xl font-black text-slate-900">{posts.length}</p>
            <p className="text-sm text-slate-500">Articles total</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-3xl font-black text-emerald-600">{posts.filter(p => p.isPublished).length}</p>
            <p className="text-sm text-slate-500">Publiés</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-3xl font-black text-amber-600">{posts.filter(p => !p.isPublished).length}</p>
            <p className="text-sm text-slate-500">Brouillons</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogAdmin;
