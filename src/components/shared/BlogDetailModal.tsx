import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Heart, Play, ExternalLink, Image, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { BlogFormDisplay } from './BlogFormDisplay';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MediaItem {
  id: string;
  media_type: string;
  url: string;
  title: string | null;
  description: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  author_name: string | null;
  category: string | null;
  featured_image_url?: string | null;
  published_at: string | null;
  created_at: string;
}

interface BlogDetailModalProps {
  post: BlogPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Get or create a session ID for anonymous likes
const getSessionId = () => {
  let sessionId = localStorage.getItem('blog_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('blog_session_id', sessionId);
  }
  return sessionId;
};

export function BlogDetailModal({ post, open, onOpenChange }: BlogDetailModalProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (post && open) {
      fetchMedia();
      fetchLikes();
    }
  }, [post, open]);

  const fetchMedia = async () => {
    if (!post) return;
    
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('entity_type', 'blog_post')
      .eq('entity_id', post.id)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setMedia(data);
    }
  };

  const fetchLikes = async () => {
    if (!post) return;
    
    const sessionId = getSessionId();
    
    // Get total likes count
    const { count } = await supabase
      .from('blog_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);

    setLikesCount(count || 0);

    // Check if current session has liked
    const { data } = await supabase
      .from('blog_likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('session_id', sessionId)
      .maybeSingle();

    setHasLiked(!!data);
  };

  const handleLike = async () => {
    if (!post || isLiking) return;
    
    setIsLiking(true);
    const sessionId = getSessionId();

    try {
      if (hasLiked) {
        // Unlike
        await supabase
          .from('blog_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('session_id', sessionId);
        
        setLikesCount(prev => Math.max(0, prev - 1));
        setHasLiked(false);
      } else {
        // Like
        await supabase
          .from('blog_likes')
          .insert({ post_id: post.id, session_id: sessionId });
        
        setLikesCount(prev => prev + 1);
        setHasLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const nextSlide = () => {
    setLightboxIndex((prev) => (prev + 1) % media.length);
  };

  const prevSlide = () => {
    setLightboxIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  if (!post) return null;

  const currentMedia = media[lightboxIndex];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4">
            <DialogHeader>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {post.category && (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {post.category}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(post.published_at || post.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                <DialogTitle className="text-xl font-heading leading-tight">
                  {post.title}
                </DialogTitle>
                {post.author_name && (
                  <p className="text-sm text-muted-foreground">By {post.author_name}</p>
                )}
              </div>
            </DialogHeader>
          </div>

          {/* Scrollable Content Area */}
          <div className="max-h-[60vh] overflow-y-auto">
            {post.featured_image_url && (
              <div className="px-6 pb-4">
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="w-full max-h-80 object-cover rounded-lg border border-border"
                />
              </div>
            )}

            {/* Content - Compact excerpt style */}
            <div className="px-6 pb-4">
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                {post.excerpt || post.content.substring(0, 200)}
              </p>
            </div>

            {/* Media Gallery - Compact thumbnails */}
            {media.length > 0 && (
              <div className="px-6 pb-4">
                <div className="flex gap-2 overflow-x-auto py-1 -my-1 px-1 -mx-1">
                  {media.slice(0, 4).map((item, index) => (
                    <button 
                      key={item.id}
                      onClick={() => item.media_type !== 'link' && openLightbox(index)}
                      className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-secondary/30 cursor-pointer ring-2 ring-transparent hover:ring-primary transition-all"
                    >
                      {item.media_type === 'image' && (
                        <img
                          src={item.url}
                          alt={item.title || 'Blog media'}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {item.media_type === 'video' && (
                        <div className="w-full h-full flex items-center justify-center bg-secondary">
                          <Play size={16} className="text-muted-foreground" />
                        </div>
                      )}
                      {item.media_type === 'link' && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-full flex items-center justify-center hover:bg-secondary/50 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={16} className="text-muted-foreground" />
                        </a>
                      )}
                    </button>
                  ))}
                  {media.length > 4 && (
                    <button
                      onClick={() => openLightbox(4)}
                      className="flex-shrink-0 w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center ring-2 ring-transparent hover:ring-primary transition-colors"
                    >
                      <span className="text-xs text-muted-foreground font-medium">+{media.length - 4}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Interactive Form */}
            <div className="px-6">
              <BlogFormDisplay postId={post.id} />
            </div>
          </div>

          {/* Footer with Like */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-secondary/20">
            <Button
              variant={hasLiked ? "default" : "ghost"}
              size="sm"
              onClick={handleLike}
              disabled={isLiking}
              className={`gap-2 ${hasLiked ? '' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Heart size={16} className={hasLiked ? "fill-current" : ""} />
              <span className="text-sm">{likesCount}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal */}
      {lightboxOpen && currentMedia && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={24} className="text-white" />
          </button>

          {/* Navigation arrows */}
          {media.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft size={28} className="text-white" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronRight size={28} className="text-white" />
              </button>
            </>
          )}

          {/* Media content */}
          <div className="max-w-4xl max-h-[80vh] w-full h-full flex items-center justify-center p-8">
            {currentMedia.media_type === 'image' && (
              <img
                src={currentMedia.url}
                alt={currentMedia.title || 'Blog media'}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
            {currentMedia.media_type === 'video' && (
              <video
                src={currentMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg"
              />
            )}
          </div>

          {/* Slide indicators */}
          {media.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {media.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setLightboxIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === lightboxIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Title */}
          {currentMedia.title && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 text-white text-sm">
              {currentMedia.title}
            </div>
          )}
        </div>
      )}
    </>
  );
}
