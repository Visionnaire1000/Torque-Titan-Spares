import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import config from "../../config";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
} from "lucide-react";
import "../../styles/itemDetails.css";

/* ---------------- Error State ---------------- */
const ErrorState = ({ onRetry }) => (
  <div className="error-state">
    <h2>Something went wrong</h2>
    <p>
      Unable to load item details. Please check your connection and try again.
    </p>
    <button className="retry-btn" onClick={onRetry}>
      <RefreshCw size={18} className="retry-icon" />
      Retry
    </button>
  </div>
);

/* ---------- Star Rating ---------- */
const StarRating = ({ value = 0, size = 22 }) => {
  const floor = Math.floor(Number(value));
  const decimal = Number(value) - floor;

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        let width = 0;
        if (star <= floor) width = 100;
        else if (star === floor + 1) width = Math.round(decimal * 100);

        return (
          <div key={star} style={{ position: "relative", width: size, height: size }}>
            <Star size={size} color="#ddd" />
            {width > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  overflow: "hidden",
                  width: `${width}%`,
                }}
              >
                <Star size={size} fill="#FFD700" color="#FFD700" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Generic Skeleton ---------- */
const Skeleton = ({ width, height, borderRadius = 4, style }) => (
  <div
    className="skeleton shimmer"
    style={{ width, height, borderRadius, ...style }}
  />
);

/* ---------- FULL PAGE SKELETON ----------- */
const ItemDetailsSkeleton = () => (
  <div className="item-details">
    <div className="item-main">
      <Skeleton width="200px" height="200px" borderRadius={8} />
      <div className="item-info">
        <Skeleton width="60%" height="28px" />
        <Skeleton width="40%" height="24px" style={{ marginTop: 8 }} />
        <Skeleton width="90%" height="16px" style={{ marginTop: 8 }} />

        <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} width="22px" height="22px" borderRadius={50} />
          ))}
        </div>
      </div>
    </div>

    <div className="admin-reviews-section">
      <Skeleton width="30%" height="24px" />

      {[...Array(3)].map((_, i) => (
        <div key={i} className="review-card">
          <Skeleton width="120px" height="16px" />
          <Skeleton width="80px" height="14px" style={{ marginTop: 4 }} />

          <div style={{ display: "flex", gap: 5, margin: "4px 0" }}>
            {[...Array(5)].map((_, j) => (
              <Skeleton key={j} width="20px" height="20px" borderRadius={50} />
            ))}
          </div>

          <Skeleton width="90%" height="14px" style={{ marginTop: 4 }} />

          <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
            <Skeleton width="60px" height="28px" borderRadius={6} />
            <Skeleton width="60px" height="28px" borderRadius={6} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ---------- EMPTY STATE ---------- */
const EmptyReviews = () => (
  <p className="muted">No reviews yet.</p>
);

const AdminItemDetails = () => {
  const { id } = useParams();
  const { user, authFetch } = useAuth();

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const currentUserId = user?.id;

  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchItemAndReviews = async () => {
    setLoading(true);
    setError(false);

    try {
      const itemRes = await authFetch(`${config.API_BASE_URL}/spareparts/${id}`);
      if (!itemRes.ok) throw new Error("Item not found");

      const itemData = await itemRes.json();

      const reviewsRes = await authFetch(
        `${config.API_BASE_URL}/admin/reviews/sparepart/${id}`
      );
      const reviewData = reviewsRes.ok ? await reviewsRes.json() : [];

      const reviewsWithReaction = Array.isArray(reviewData)
        ? reviewData.map((r) => {
            const userReaction = r.likes?.find(
              (l) => l.user_id === currentUserId
            );

            return {
              ...r,
              user_reaction:
                userReaction === undefined
                  ? null
                  : userReaction.is_like
                  ? true
                  : false,
              display_name: r.user_display_name || "User",
              comment: r.comment || r.text || "",
            };
          })
        : [];

      setItem(itemData);
      setReviews(reviewsWithReaction);
    } catch (err) {
      console.error(err);
      setError(true);
      toast.error(err.message || "Failed to load item details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemAndReviews();
  }, [id]);

  /* ---------- STATES ---------- */
  if (loading) return <ItemDetailsSkeleton />;
  if (error) return <ErrorState onRetry={fetchItemAndReviews} />;
  if (!item) return <ErrorState onRetry={fetchItemAndReviews} />;

  const averageRating = Number(item?.average_rating || 0);

  return (
    <div className="item-details">
      <div className="item-main">
        <img src={item.image} alt={item.brand} />

        <div className="item-info">
          <h2>
            {item.brand} {item.category} for {item.vehicle_type}
          </h2>

          <p id="price">
            KES {item.buying_price?.toLocaleString() || "0"}
            {item.discount_percentage > 0 && (
              <span id="discount">
                (-{item.discount_percentage.toFixed(0)}%)
              </span>
            )}
          </p>

          <p id="describe">{item.description}</p>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <StarRating value={averageRating} size={22} />
            <span>
              {averageRating.toFixed(1)} (
              {reviews.filter((r) => r.comment?.trim()).length})
            </span>
          </div>
        </div>
      </div>

      <div className="admin-reviews-section">
        <h3>
          Customer Reviews (
          {reviews.filter((r) => r.comment?.trim()).length})
        </h3>

        {reviews.length === 0 ? (
          <EmptyReviews />
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="review-card">
              <div className="review-header">
                <span className="review-user">
                  {r.user_id === currentUserId ? (
                    <span className="you-badge">You</span>
                  ) : (
                    r.display_name
                  )}
                </span>

                <span className="review-date">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleDateString("en-GB")
                    : ""}
                </span>
              </div>
              <div className="admin-star">
              <StarRating value={r.rating || 0} size={20} />
              </div>
              {r.comment && <p className="review">{r.comment}</p>}

              <div className="review-reactions">
                <span>
                  <ThumbsUp size={16} /> {r.total_likes || 0}
                </span>
                <span>
                  <ThumbsDown size={16} /> {r.total_dislikes || 0}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminItemDetails;