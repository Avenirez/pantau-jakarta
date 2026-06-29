"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, Send, Trash2, MessageSquare, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

interface Review {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  comment: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  return `${months} bulan lalu`;
}

function StarRating({
  value,
  onChange,
  readonly = false,
  size = 20,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: number;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`transition-all duration-150 ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          }`}
        >
          <Star
            size={size}
            className={`transition-colors duration-150 ${
              star <= (hover || value)
                ? "fill-jakarta-amber text-jakarta-amber"
                : "fill-transparent text-slate-600"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewSection({ villageId }: { villageId: number }) {
  const { user, signInWithGoogle } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Check if current user already reviewed
  const myReview = user
    ? reviews.find((r) => r.user_id === user.id)
    : null;

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("village_id", villageId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReviews(data);
    }
    setLoading(false);
  }, [villageId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Calculate average
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  // Submit review
  const handleSubmit = async () => {
    if (!user) return;
    if (rating === 0) {
      setFormError("Pilih rating bintang terlebih dahulu.");
      return;
    }
    if (comment.trim().length < 10) {
      setFormError("Ulasan minimal 10 karakter.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    setFormSuccess("");

    const { error } = await supabase.from("reviews").upsert(
      {
        village_id: villageId,
        user_id: user.id,
        user_name:
          user.user_metadata?.full_name || user.email || "Warga Jakarta",
        user_avatar: user.user_metadata?.avatar_url || null,
        rating,
        comment: comment.trim(),
      },
      { onConflict: "village_id,user_id" }
    );

    setSubmitting(false);

    if (error) {
      setFormError(`Gagal mengirim ulasan: ${error.message}`);
    } else {
      setFormSuccess("Ulasan berhasil dikirim!");
      setRating(0);
      setComment("");
      fetchReviews();
      setTimeout(() => setFormSuccess(""), 3000);
    }
  };

  // Delete review
  const handleDelete = async (reviewId: string) => {
    if (!confirm("Hapus ulasan kamu?")) return;

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId);

    if (!error) {
      fetchReviews();
    }
  };

  return (
    <section className="glass-card p-8 opacity-0 animate-fade-in-up animate-delay-400">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-jakarta-amber/20 text-jakarta-amber">
          <MessageSquare size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            Ulasan Warga
          </h2>
          <p className="text-xs text-slate-400">
            Berikan penilaian dan ulasan untuk kelurahan ini
          </p>
        </div>
      </div>

      {/* Average Rating Summary */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {avgRating.toFixed(1)}
            </p>
            <StarRating value={Math.round(avgRating)} readonly size={14} />
          </div>
          <div className="h-10 w-px bg-slate-700" />
          <p className="text-sm text-slate-400">
            <span className="text-white font-medium">{reviews.length}</span>{" "}
            ulasan dari warga
          </p>
        </div>
      )}

      {/* Review Form or Login CTA */}
      {user ? (
        myReview ? (
          /* Already reviewed */
          <div className="mb-6 p-4 rounded-xl bg-jakarta-emerald/10 border border-jakarta-emerald/20">
            <p className="text-sm text-jakarta-emerald">
              Kamu sudah memberikan ulasan (rating {myReview.rating}/5).
              Kamu bisa menghapus ulasan lama untuk menulis yang baru.
            </p>
          </div>
        ) : (
          /* Review Form */
          <div className="mb-6 p-5 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">
                Rating
              </label>
              <StarRating value={rating} onChange={setRating} size={28} />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">
                Ulasan kamu
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tulis pendapatmu tentang pengelolaan anggaran kelurahan ini... (min. 10 karakter)"
                rows={3}
                className="
                  w-full bg-slate-900/80 border border-slate-600/50
                  text-white placeholder-slate-500
                  rounded-xl px-4 py-3 resize-none
                  focus:outline-none focus:ring-2 focus:ring-jakarta-amber/50 focus:border-jakarta-amber
                  transition-colors
                "
              />
              <p className="text-xs text-slate-500 mt-1">
                {comment.length}/10 karakter minimum
              </p>
            </div>

            {formError && (
              <p className="text-sm text-red-400">{formError}</p>
            )}
            {formSuccess && (
              <p className="text-sm text-jakarta-emerald">{formSuccess}</p>
            )}

            <button
              id="btn-submit-review"
              onClick={handleSubmit}
              disabled={submitting}
              className="
                flex items-center gap-2 px-6 py-2.5 rounded-xl
                bg-gradient-to-r from-jakarta-amber to-yellow-500
                text-slate-900 font-semibold text-sm
                hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                transition-opacity
              "
            >
              <Send size={16} />
              {submitting ? "Mengirim..." : "Kirim Ulasan"}
            </button>
          </div>
        )
      ) : (
        /* Not Logged In — CTA */
        <div className="mb-6 p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 border-dashed text-center">
          <LogIn size={28} className="mx-auto text-slate-500 mb-3" />
          <p className="text-sm text-slate-400 mb-4">
            Login dengan akun Google untuk memberikan rating dan ulasan.
          </p>
          <button
            onClick={signInWithGoogle}
            className="
              inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-white/10 border border-white/20
              text-sm text-white font-medium
              hover:bg-white/20 transition-all
            "
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Login dengan Google
          </button>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-3 border-jakarta-amber border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-center text-slate-500 py-8 text-sm">
          Belum ada ulasan. Jadilah yang pertama memberikan ulasan!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 transition-all hover:border-slate-600/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {review.user_avatar ? (
                    <img
                      src={review.user_avatar}
                      alt={review.user_name}
                      className="w-9 h-9 rounded-full border border-slate-600"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                      {review.user_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">
                      {review.user_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <StarRating value={review.rating} readonly size={12} />
                      <span className="text-xs text-slate-500">
                        {timeAgo(review.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delete button (only for own reviews) */}
                {user && user.id === review.user_id && (
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    title="Hapus ulasan"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <p className="mt-3 text-sm text-slate-300 leading-relaxed pl-12">
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
