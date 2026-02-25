
import { BlogPost } from '../types';
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

const BLOG_COLLECTION = 'blog_posts';

// Génère un slug à partir du titre
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9\s-]/g, '') // Supprime les caractères spéciaux
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/-+/g, '-') // Supprime les tirets multiples
    .trim();
};

// Calcule le temps de lecture (moyenne 200 mots/min)
export const calculateReadingTime = (content: string): number => {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
};

// --- CRUD Operations ---

export const createBlogPost = async (post: Omit<BlogPost, 'id'>): Promise<BlogPost> => {
  const id = Date.now().toString();
  const newPost: BlogPost = {
    ...post,
    id,
    slug: post.slug || generateSlug(post.title),
    readingTime: calculateReadingTime(post.content),
    publishedAt: post.publishedAt || new Date().toISOString()
  };

  await setDoc(doc(db, BLOG_COLLECTION, id), newPost);
  return newPost;
};

export const updateBlogPost = async (id: string, updates: Partial<BlogPost>): Promise<void> => {
  const postRef = doc(db, BLOG_COLLECTION, id);
  const updatedData = {
    ...updates,
    updatedAt: new Date().toISOString(),
    readingTime: updates.content ? calculateReadingTime(updates.content) : undefined
  };

  // Remove undefined values
  Object.keys(updatedData).forEach(key => {
    if (updatedData[key as keyof typeof updatedData] === undefined) {
      delete updatedData[key as keyof typeof updatedData];
    }
  });

  await setDoc(postRef, updatedData, { merge: true });
};

export const deleteBlogPost = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, BLOG_COLLECTION, id));
};

export const getBlogPostById = async (id: string): Promise<BlogPost | null> => {
  const docSnap = await getDoc(doc(db, BLOG_COLLECTION, id));
  return docSnap.exists() ? (docSnap.data() as BlogPost) : null;
};

export const getBlogPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  try {
    const q = query(
      collection(db, BLOG_COLLECTION),
      where('slug', '==', slug),
      where('isPublished', '==', true),
      limit(1)
    );
    const snap = await getDocs(q);
    return snap.empty ? null : (snap.docs[0].data() as BlogPost);
  } catch (error: any) {
    console.warn('[BlogService] Could not load blog post by slug:', error.code || error.message);
    return null;
  }
};

// --- Listing Functions ---

export const getAllBlogPosts = async (onlyPublished: boolean = true): Promise<BlogPost[]> => {
  try {
    let q;
    if (onlyPublished) {
      q = query(
        collection(db, BLOG_COLLECTION),
        where('isPublished', '==', true),
        orderBy('publishedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, BLOG_COLLECTION),
        orderBy('publishedAt', 'desc')
      );
    }

    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as BlogPost);
  } catch (error: any) {
    // Si les règles Firestore bloquent l'accès, retourner un tableau vide
    // plutôt que de faire crasher la page blog
    console.warn('[BlogService] Could not load blog posts:', error.code || error.message);
    return [];
  }
};

export const getBlogPostsByCategory = async (category: string): Promise<BlogPost[]> => {
  try {
    const q = query(
      collection(db, BLOG_COLLECTION),
      where('category', '==', category),
      where('isPublished', '==', true),
      orderBy('publishedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as BlogPost);
  } catch (error: any) {
    console.warn('[BlogService] Could not load blog posts by category:', error.code || error.message);
    return [];
  }
};

export const getRecentBlogPosts = async (count: number = 5): Promise<BlogPost[]> => {
  try {
    const q = query(
      collection(db, BLOG_COLLECTION),
      where('isPublished', '==', true),
      orderBy('publishedAt', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as BlogPost);
  } catch (error: any) {
    console.warn('[BlogService] Could not load recent blog posts:', error.code || error.message);
    return [];
  }
};

// --- Categories ---
export const BLOG_CATEGORIES = [
  { value: 'conseils', label: 'Conseils Running', icon: '💡' },
  { value: 'nutrition', label: 'Nutrition', icon: '🥗' },
  { value: 'entrainement', label: 'Entraînement', icon: '🏃' },
  { value: 'equipement', label: 'Équipement', icon: '👟' },
  { value: 'temoignages', label: 'Témoignages', icon: '⭐' },
  { value: 'actualites', label: 'Actualités', icon: '📰' }
];
