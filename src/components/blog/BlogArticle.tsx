
import React, { useState, useEffect } from 'react';
import { Helmet } from "react-helmet-async";
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BlogPost } from '../../types';
import { getBlogPostBySlug, getRecentBlogPosts, getBlogPostsByCategory, BLOG_CATEGORIES } from '../../services/blogService';
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
        // Load related posts — même catégorie d'abord, sinon récents
        let related: BlogPost[] = [];
        if (data.category) {
          related = (await getBlogPostsByCategory(data.category)).filter(p => p.id !== data.id);
        }
        if (related.length < 3) {
          const recent = await getRecentBlogPosts(6);
          const recentFiltered = recent.filter(p => p.id !== data.id && !related.some(r => r.id === p.id));
          related = [...related, ...recentFiltered];
        }
        setRelatedPosts(related.slice(0, 3));
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
        <Helmet>
          <title>Article non trouvé | Coach Running IA</title>
          <meta name="robots" content="noindex" />
        </Helmet>
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
        <title>{post.seoTitle || post.title} | Coach Running IA</title>
        <meta name="description" content={post.excerpt?.length > 155 ? post.excerpt.substring(0, 152) + '...' : post.excerpt} />
        <link rel="canonical" href={`https://coachrunningia.fr/blog/${post.slug}`} />
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.seoTitle || post.title} />
        <meta property="og:description" content={post.excerpt?.length > 155 ? post.excerpt.substring(0, 152) + '...' : post.excerpt} />
        <meta property="og:image" content={post.coverImage || "https://coachrunningia.fr/og-image.png"} />
        <meta property="og:url" content={`https://coachrunningia.fr/blog/${post.slug}`} />
        <meta property="og:site_name" content="Coach Running IA" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="article:published_time" content={post.createdAt?.toDate?.()?.toISOString?.() || ''} />
        {category && <meta property="article:section" content={category.label} />}
        {post.tags?.map((tag: string, i: number) => <meta key={i} property="article:tag" content={tag} />)}
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${post.seoTitle || post.title} | Coach Running IA`} />
        <meta name="twitter:description" content={post.excerpt?.length > 155 ? post.excerpt.substring(0, 152) + '...' : post.excerpt} />
        <meta name="twitter:image" content={post.coverImage || "https://coachrunningia.fr/og-image.png"} />
        {/* Schema Article enrichi */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.seoTitle || post.title,
          "description": post.excerpt,
          "image": post.coverImage || "https://coachrunningia.fr/og-image.png",
          "author": { "@type": "Organization", "name": "Coach Running IA", "url": "https://coachrunningia.fr" },
          "publisher": {
            "@type": "Organization",
            "name": "Coach Running IA",
            "logo": { "@type": "ImageObject", "url": "https://coachrunningia.fr/favicon-32x32.png" }
          },
          "datePublished": post.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          "dateModified": (post as any).updatedAt?.toDate?.()?.toISOString?.() || post.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://coachrunningia.fr/blog/${post.slug}`
          },
          "url": `https://coachrunningia.fr/blog/${post.slug}`,
          "articleSection": category?.label || "Running",
          "wordCount": post.content?.split(/\s+/).length || 0,
          "inLanguage": "fr-FR"
        })}</script>
      </Helmet>
      {/* Hero Image */}
      {post.coverImage && (
        <div className="w-full h-[40vh] md:h-[50vh] relative">
          <img
            src={post.coverImage}
            alt={`${post.title} — ${category?.label || 'Running'} | Coach Running IA`}
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
