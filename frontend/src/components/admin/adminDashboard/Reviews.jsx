import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { Link } from "react-router-dom";
import config from "../../../config";
import { RefreshCw, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import "../../../styles/admin/reviews.css";

/* ---------------- Skeleton Loader ---------------- */
const SkeletonCard = () => (
  <div className="review-card skeleton">
    <div className="skeleton-line short"></div>
    <div className="skeleton-line"></div>
    <div className="skeleton-image"></div>
    <div className="skeleton-line"></div>
    <div className="skeleton-line small"></div>
  </div>
);

/* ---------------- Error State ---------------- */
const ErrorState = ({ onRetry }) => (
  <div className="error-state">
    <h2>Something went wrong</h2>
    <p>Unable to load reviews. Please check your connection and try again.</p>
    <button className="retry-btn" onClick={onRetry}>
      <RefreshCw size={18} className="retry-icon" />
      Retry
    </button>
  </div>
);

/* ---------------- Empty State ---------------- */
const EmptyState = () => (
  <div className="message">No reviews yet.</div>
);

const Reviews = () => {
  const { authFetch, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reviewsRef = useRef([]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}/${date.getFullYear()}`;
  };

  const hasReviewsChanged = (newData) => {
    const prev = reviewsRef.current;
    if (newData.length !== prev.length) return true;
    const prevMap = new Map(prev.map((r) => [r.id, r.created_at]));
    for (let r of newData) {
      if (!prevMap.has(r.id) || prevMap.get(r.id) !== r.created_at) return true;
    }
    return false;
  };

  const fetchReviews = async (isInitial = false) => {
    if (!user) {
      if (isInitial) setLoading(false);
      return;
    }

    if (isInitial) setLoading(true);
    setError("");

    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/reviews`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      const data = await res.json();
      if (hasReviewsChanged(data)) {
        setReviews(data);
        reviewsRef.current = data;
        localStorage.setItem("admin_reviews_cache", JSON.stringify(data));
        window.dispatchEvent(new Event("admin_reviews_updated"));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const markReviewsAsSeen = (data) => {
    if (!data || data.length === 0) return;
    const existing = JSON.parse(localStorage.getItem("admin_seen_review_ids")) || [];
    const allIds = data.map((r) => r.id);
    const hasNew = allIds.some((id) => !existing.includes(id));
    if (!hasNew) return;
    localStorage.setItem("admin_seen_review_ids", JSON.stringify(allIds));
    window.dispatchEvent(new Event("admin_reviews_updated"));
  };

  useEffect(() => {
    fetchReviews(true);
    const interval = setInterval(() => fetchReviews(false), 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (reviews.length) markReviewsAsSeen(reviews);
  }, [reviews]);

  if (loading) {
    return (
      <div className="reviews-container">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState onRetry={() => fetchReviews(true)} />;
  if (!reviews.length) return <EmptyState />;

  return (
    <div className="reviews-container">
      <div className="reviews-summary">
        <strong>Total Reviews:</strong> {reviews.length}
      </div>

      {reviews.map((r) => (
        <Link
          key={r.id}
          to={`/items/${r.sparepart_id}`}
          className="item-card-link"
        >
          <div className="review-card">
            <div className="review-card-header">
              <strong className="display-name">{r.user_display_name}</strong>
              <span className="review-date">{formatDate(r.created_at)}</span>
            </div>

            {r.sparepart_image && (
              <div className="review-image-wrapper">
                <img
                  src={r.sparepart_image}
                  className="review-image"
                  alt="review"
                />
              </div>
            )}

            <div className="review-rating">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < r.rating ? "star filled" : "star"}
                />
              ))}
              <span className="rating-value">({r.rating})</span>
            </div>

            {r.comment && <p className="review-comment">{r.comment}</p>}

            <div className="review-reactions">
              <span className="reaction">
                <ThumbsUp size={14} />
                {r.total_likes}
              </span>
              <span className="reaction">
                <ThumbsDown size={14} />
                {r.total_dislikes}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default Reviews;