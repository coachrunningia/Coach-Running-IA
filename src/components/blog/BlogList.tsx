
import React, { useState, useEffect } from 'react';
import { Helmet } from "react-helmet-async";
import { BlogPost } from '../../types';
import { getAllBlogPosts, getBlogPostsByCategory, BLOG_CATEGORIES } from '../../services/blogService';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Tag, ArrowRight, Loader2, Search } from 'lucide-react';

const BlogList: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPosts();
  }, [selectedCategory]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = selectedCategory
        ? await getBlogPostsByCategory(selectedCategory)
        : await getAllBlogPosts(true);
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Helmet>
        <title>Blog Running : Conseils Entraînement et Nutrition | Coach Running IA</title>
        <meta name="description" content="Conseils running, entraînement et nutrition : articles rédigés par des experts pour progresser en course à pied. Blog Coach Running IA." />
        <link rel="canonical" href="https://coachrunningia.fr/blog" />
        <meta property="og:title" content="Blog Running : Conseils Entraînement et Nutrition" />
        <meta property="og:description" content="Conseils running, entraînement et nutrition pour progresser en course à pied." />
        <meta property="og:url" content="https://coachrunningia.fr/blog" />
      </Helmet>
      {/* Hero */}
      <div className="bg-slate-900 text-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4">Blog Running</h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Conseils d'experts, techniques d'entraînement et astuces pour améliorer vos performances
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un article..."
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                !selectedCategory
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous
            </button>
            {BLOG_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-accent" size={40} />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500">Aucun article trouvé</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map(post => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
              >
                {/* Image */}
                {post.coverImage ? (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <span className="text-6xl opacity-30">
                      {BLOG_CATEGORIES.find(c => c.value === post.category)?.icon || '📝'}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  {/* Category Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-accent/10 text-accent text-xs font-bold px-3 py-1 rounded-full">
                      {BLOG_CATEGORIES.find(c => c.value === post.category)?.label || post.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-accent transition-colors line-clamp-2">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-slate-500 text-sm mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(post.publishedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      {post.readingTime && (
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {post.readingTime} min
                        </span>
                      )}
                    </div>
                    <ArrowRight size={18} className="text-accent opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-accent/10 to-orange-100 rounded-3xl p-10">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Prêt à passer à l'action ?
          </h3>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto">
            Créez votre plan d'entraînement personnalisé avec notre coach IA et atteignez vos objectifs running.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-accent text-white px-8 py-4 rounded-full font-bold hover:bg-orange-600 transition-colors shadow-lg"
          >
            Créer mon plan gratuit
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogList;
