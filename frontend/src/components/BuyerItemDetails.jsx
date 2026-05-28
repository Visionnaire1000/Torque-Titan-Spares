import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import config from "../config";
import "../styles/itemDetails.css";
import { Star, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";

/* ---------------- Error State ---------------- */
const ErrorState = ({ onRetry }) => (
  <div className="error-state">
    <h2>Something went wrong</h2>
    <p>
      Unable to load spare parts. Please check your connection and try again.
    </p>
    <button className="retry-btn" onClick={onRetry}>
      <RefreshCw size={18} className="retry-icon" />
      Retry
    </button>
  </div>
);

/* ---------- Star Rating Component ---------- */
const StarRating = ({ value = 0, onChange, size = 24, readonly = false }) => {
  const [hoverValue, setHoverValue] = useState(0);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleClick = (star) => {
    if (readonly || !onChange) return;
    setCurrentValue(star);
    onChange(star);
  };

  const handleMouseEnter = (star) => {
    if (readonly) return;
    setHoverValue(star);
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverValue(0);
  };

  const displayValue = hoverValue || currentValue;
  const roundedValue = Math.round(displayValue * 2) / 2;

  return (
    <div className="stars" style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        let fillPercent = 0;
        if (roundedValue >= star) fillPercent = 100;
        else if (roundedValue + 0.5 === star) fillPercent = 50;

        return (
          <div
            key={star}
            className="star-wrapper"
            style={{
              width: size,
              height: size,
              position: "relative",
              cursor: readonly ? "default" : "pointer",
            }}
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
          >
            <Star size={size} fill="#ddd" stroke="#ddd" />
            <div
              className="star-fill"
              style={{
                width: `${fillPercent}%`,
                overflow: "hidden",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              <Star size={size} fill="#FFD700" stroke="#FFD700" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Skeleton Component ---------- */
const Skeleton = ({ width, height, borderRadius = 4 }) => (
  <div
    className="skeleton shimmer"
    style={{ width, height, borderRadius }}
  />
);

/* ---------- Skeleton Loader for Item Details ---------- */
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
        <Skeleton width="120px" height="32px" borderRadius={6} style={{ marginTop: 12 }} />
      </div>
    </div>

    <div className="add-review">
      <Skeleton width="30%" height="24px" />
      <div style={{ display: "flex", gap: 5, margin: "8px 0" }}>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} width="22px" height="22px" borderRadius={50} />
        ))}
      </div>
      <Skeleton width="100%" height="60px" borderRadius={6} />
      <Skeleton width="120px" height="32px" borderRadius={6} style={{ marginTop: 8 }} />
    </div>

    <div className="reviews-section">
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

/* ---------- Buyer Item Details Component ---------- */
const BuyerItemDetails = () => {
  const { id } = useParams();
  const { addItem } = useCart();
  const { user, authFetch } = useAuth();
  const currentUserId = user?.id;

  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");

  /* ---------- Fetch Item + Reviews ---------- */
  const fetchItemAndReviews = async () => {
    setLoading(true);
    setError(false);
    try {
      const [itemRes, reviewsRes] = await Promise.all([
        fetch(`${config.API_BASE_URL}/spareparts/${id}`),
        fetch(`${config.API_BASE_URL}/reviews/${id}`),
      ]);

      if (!itemRes.ok || !reviewsRes.ok) throw new Error("Failed to fetch data");

      const itemData = await itemRes.json();
      const reviewData = await reviewsRes.json();

      const reviewsWithReaction = reviewData.map((r) => {
        const userReaction = r.likes?.find((l) => l.user_id === currentUserId);
        return {
          ...r,
          user_reaction:
            userReaction === undefined
              ? null
              : userReaction.is_like
              ? true
              : false,
          display_name: r.user_display_name || "User",
        };
      });

      setItem(itemData);
      setReviews(reviewsWithReaction);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemAndReviews();
  }, [id]);

  const averageRating = Number(item?.average_rating || 0);
  const userReview = reviews.find((r) => r.user_id === currentUserId);

  /* ---------- Review Actions ---------- */
  const handleReviewAction = async ({ method, endpoint, body, successMessage, updateFn }) => {
    try {
      const res = await authFetch(`${config.API_BASE_URL}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Action failed");
      }

      const data = method !== "DELETE" ? await res.json() : null;
      if (updateFn) updateFn(data);
      if (successMessage) toast.success(successMessage);

      fetchItemAndReviews();
    } catch (err) {
      toast.error(err.message || "Action failed");
    }
  };

  const submitReview = () => {
    if (userReview) {
      toast.info("You already reviewed this item. You can edit or delete your review.");
      return;
    }
    if (!rating && !comment.trim()) {
      toast.error("Add a rating or comment");
      return;
    }
    handleReviewAction({
      method: "POST",
      endpoint: `/reviews/${id}`,
      body: { rating: rating || undefined, comment: comment.trim() || undefined },
      successMessage: "Review added",
      updateFn: (newReview) => setReviews([newReview, ...reviews]),
    });
    setRating(0);
    setComment("");
  };

  const startEdit = (review) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating || 0);
    setEditComment(review.comment || "");
  };
  const cancelEdit = () => {
    setEditingReviewId(null);
    setEditRating(0);
    setEditComment("");
  };
  const saveEdit = (reviewId) => {
    if (!editRating && !editComment.trim()) {
      toast.error("Add a rating or comment");
      return;
    }
    handleReviewAction({
      method: "PATCH",
      endpoint: `/reviews/edit/${reviewId}`,
      body: { rating: editRating || undefined, comment: editComment.trim() || undefined },
      successMessage: "Review updated",
      updateFn: (updatedReview) =>
        setReviews((prev) => prev.map((r) => (r.id === reviewId ? updatedReview : r))),
    });
    cancelEdit();
  };
  const deleteReview = (reviewId) =>
    handleReviewAction({
      method: "DELETE",
      endpoint: `/reviews/edit/${reviewId}`,
      successMessage: "Review deleted",
      updateFn: () => setReviews((prev) => prev.filter((r) => r.id !== reviewId)),
    });

  const reactToReview = async (reviewId, isLike, reviewUserId) => {
    if (reviewUserId === currentUserId) return toast.info("Cannot react to your own review");

    setReviews((prev) =>
      prev.map((r) => {
        if (r.id !== reviewId) return r;
        let newUserReaction = r.user_reaction;
        let newLikes = r.total_likes;
        let newDislikes = r.total_dislikes;

        if (r.user_reaction === isLike) {
          newUserReaction = null;
          if (isLike) newLikes = Math.max(0, r.total_likes - 1);
          else newDislikes = Math.max(0, r.total_dislikes - 1);
        } else {
          newUserReaction = isLike;
          if (isLike) {
            newLikes = r.user_reaction === false ? r.total_likes + 1 : r.total_likes + 1;
            newDislikes = r.user_reaction === false ? Math.max(0, r.total_dislikes - 1) : r.total_dislikes;
          } else {
            newDislikes = r.user_reaction === true ? r.total_dislikes + 1 : r.total_dislikes + 1;
            newLikes = r.user_reaction === true ? Math.max(0, r.total_likes - 1) : r.total_likes;
          }
        }
        return { ...r, user_reaction: newUserReaction, total_likes: newLikes, total_dislikes: newDislikes };
      })
    );

    try {
      const res = await authFetch(`${config.API_BASE_URL}/reviews/${reviewId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_like: isLike }),
      });
      if (!res.ok) throw new Error("Failed to react");
      const data = await res.json();
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, total_likes: data.review.total_likes, total_dislikes: data.review.total_dislikes }
            : r
        )
      );
    } catch (err) {
      toast.error(err.message || "Action failed");
      fetchItemAndReviews();
    }
  };

  /* ---------- Render ---------- */
  if (loading) return <ItemDetailsSkeleton />;
  if (error) return <ErrorState onRetry={fetchItemAndReviews} />;
  if (!item) return <div className="item-details">Item not found</div>;

  const sortedReviews = [...reviews].sort((a, b) =>
    a.user_id === currentUserId ? -1 : b.user_id === currentUserId ? 1 : 0
  );

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
              <span id="discount">(-{item.discount_percentage.toFixed(0)}%)</span>
            )}
          </p>
          <p id="describe">{item.description}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <StarRating value={averageRating} readonly size={22} />
            <span>
              {averageRating.toFixed(1)} ({reviews.filter((r) => r.rating != null).length})
            </span>
          </div>
          <button onClick={() => addItem(item)}>Add To Cart</button>
        </div>
      </div>

      {!userReview ? (
        <div className="add-review">
          <h3>Add a Review</h3>
          <StarRating value={rating} onChange={setRating} />
          <textarea
            placeholder="Write a comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button onClick={submitReview}>Submit Review</button>
        </div>
      ) : (
        <p className="muted">
          You already reviewed this item. You can edit or delete your review below.
        </p>
      )}

      <div className="reviews-section">
        <h3>Customer Reviews ({reviews.filter((r) => r.comment?.trim()).length})</h3>
        {sortedReviews.map((r) => (
          <div key={r.id} className="review-card">
            {editingReviewId === r.id ? (
              <>
                <StarRating value={editRating} onChange={setEditRating} />
                <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} />
                <div className="edit-buttons">
                  <button onClick={() => saveEdit(r.id)}>Save</button>
                  <button onClick={cancelEdit}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="review-header">
                  <span className="review-user">
                    {r.user_id === currentUserId ? <span className="you-badge">You</span> : r.display_name}
                  </span>
                  <span className="review-date">
                    {new Date(r.created_at).toLocaleDateString("en-GB")}
                  </span>
                </div>
                <StarRating value={r.rating || 0} readonly size={20} />
                {r.comment && <p className="comment">{r.comment}</p>}

                {r.user_id === currentUserId ? (
                  <div className="user-review-buttons">
                    <button onClick={() => startEdit(r)}>Edit</button>
                    <button onClick={() => deleteReview(r.id)}>Delete</button>
                  </div>
                ) : (
                  <div className="review-reactions">
                    <button
                      onClick={() => reactToReview(r.id, true, r.user_id)}
                      className={r.user_reaction === true ? "active like-btn" : ""}
                    >
                      <ThumbsUp size={16} /> {r.total_likes || 0}
                    </button>
                    <button
                      onClick={() => reactToReview(r.id, false, r.user_id)}
                      className={r.user_reaction === false ? "active dislike-btn" : ""}
                    >
                      <ThumbsDown size={16} /> {r.total_dislikes || 0}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BuyerItemDetails;