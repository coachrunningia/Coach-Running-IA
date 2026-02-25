
import React, { useState, useEffect } from 'react';
import { Helmet } from "react-helmet-async";
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BlogPost } from '../../types';
import { getBlogPostBySlug, getRecentBlogPosts, BLOG_CATEGORIES } from '../../services/blogService';
import { Calendar, Clock, Tag, ArrowLeft, ArrowRight, Share2, Loader2, User } from 'lucide-react';

const BlogArticle: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadPost(slug);
    }
  }, [slug]);

  const loadPost = async (slug: string) => {
    setLoading(true);
    try {
      const data = await getBlogPostBySlug(slug);
      if (data) {
        setPost(data);
        // Update page title for SEO
        document.title = data.seoTitle || data.title;
        // Load related posts
        const recent = await getRecentBlogPosts(4);
        setRelatedPosts(recent.filter(p => p.id !== data.id).slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié !');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Article non trouvé</h1>
        <Link to="/blog" className="text-accent font-bold hover:underline">
          Retour au blog
        </Link>
      </div>
    );
  }

  const category = BLOG_CATEGORIES.find(c => c.value === post.category);

  return (
    <div className="min-h-screen bg-white">
<Helmet>
        <meta name="description" content={post.excerpt} />
      </Helmet>
      {/* Hero Image */}
      {post.coverImage && (
        <div className="w-full h-[40vh] md:h-[50vh] relative">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Back Link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8"
        >
          <ArrowLeft size={18} />
          Retour au blog
        </Link>

        {/* Article Header */}
        <header className="mb-10">
          {/* Category */}
          <div className="mb-4">
            <span className="bg-accent/10 text-accent text-sm font-bold px-4 py-1.5 rounded-full">
              {category?.icon} {category?.label}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-6">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-6 text-slate-500">
            <span className="flex items-center gap-2">
              <User size={18} />
              {post.author}
            </span>
            <span className="flex items-center gap-2">
              <Calendar size={18} />
              {new Date(post.publishedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
            {post.readingTime && (
              <span className="flex items-center gap-2">
                <Clock size={18} />
                {post.readingTime} min de lecture
              </span>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-accent hover:text-orange-600"
            >
              <Share2 size={18} />
              Partager
            </button>
          </div>
        </header>

        {/* Article Content */}
        <article
          className="prose prose-lg prose-slate max-w-none mb-16
            prose-headings:font-bold prose-headings:text-slate-900
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-slate-600 prose-p:leading-relaxed
            prose-a:text-accent prose-a:no-underline hover:prose-a:underline
            prose-strong:text-slate-900
            prose-ul:my-4 prose-li:text-slate-600
            prose-blockquote:border-l-accent prose-blockquote:bg-slate-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
          "
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="border-t border-slate-100 pt-8 mb-12">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={18} className="text-slate-400" />
              {post.tags.map(tag => (
                <span key={tag} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 md:p-10 text-white mb-12">
          <h3 className="text-2xl font-bold mb-3">Envie de progresser ?</h3>
          <p className="text-slate-300 mb-6">
            Créez votre plan d'entraînement personnalisé avec notre coach IA et atteignez vos objectifs running.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-full font-bold hover:bg-orange-600 transition-colors"
          >
            Créer mon plan gratuit
            <ArrowRight size={18} />
          </Link>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="border-t border-slate-100 pt-10">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Articles similaires</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map(relatedPost => (
                <Link
                  key={relatedPost.id}
                  to={`/blog/${relatedPost.slug}`}
                  className="group"
                >
                  {relatedPost.coverImage ? (
                    <div className="aspect-video rounded-xl overflow-hidden mb-3">
                      <img
                        src={relatedPost.coverImage}
                        alt={relatedPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-xl bg-slate-100 mb-3 flex items-center justify-center">
                      <span className="text-3xl opacity-30">
                        {BLOG_CATEGORIES.find(c => c.value === relatedPost.category)?.icon}
                      </span>
                    </div>
                  )}
                  <h4 className="font-bold text-slate-900 group-hover:text-accent transition-colors line-clamp-2">
                    {relatedPost.title}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogArticle;
