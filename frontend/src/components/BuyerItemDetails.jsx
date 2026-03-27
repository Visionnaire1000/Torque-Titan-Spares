import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import config from "../config";
import "../styles/itemDetails.css";

/* ---------- Star Rating Component ---------- */
const StarRating = ({ value = 0, onChange, size = 28, readonly = false }) => {
  const roundedValue = Math.round(Number(value) * 2) / 2;

  const handleClick = (star) => {
    if (readonly) return;
    onChange(roundedValue === star ? 0 : star);
  };

  return (
    <div className="stars" style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        let starClass = "empty";
        if (roundedValue >= star) starClass = "filled";
        else if (roundedValue + 0.5 === star) starClass = "half";

        return (
          <span
            key={star}
            className={`star ${starClass}`}
            style={{
              fontSize: size,
              cursor: readonly ? "default" : "pointer",
            }}
            onClick={() => handleClick(star)}
          >
            {starClass === "half" ? "⯨" : "★"}
          </span>
        );
      })}
    </div>
  );
};

const BuyerItemDetails = () => {
  const { id } = useParams();
  const { addItem } = useCart();
  const { user, authFetch } = useAuth();
  const currentUserId = user?.id;

  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");

  /* ---------- Fetch Item + Reviews ---------- */
  const fetchItemAndReviews = async () => {
    setLoading(true);
    try {
      const [itemRes, reviewsRes] = await Promise.all([
        fetch(`${config.API_BASE_URL}/spareparts/${id}`),
        fetch(`${config.API_BASE_URL}/reviews/${id}`),
      ]);

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
      toast.error("Failed to load item details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemAndReviews();
  }, [id]);

  const averageRating = item?.average_rating ? Number(item.average_rating) : 0;
  const userReview = reviews.find((r) => r.user_id === currentUserId);

  const refreshItem = async () => {
    try {
      const res = await fetch(`${config.API_BASE_URL}/spareparts/${id}`);
      const data = await res.json();
      setItem(data);
    } catch (err) {
      console.error(err);
    }
  };

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

      refreshItem();
    } catch (err) {
      toast.error(err.message || "Action failed");
    }
  };

  /* ---------- Review CRUD ---------- */
  const submitReview = () => {
    if (userReview) {
      toast.info("You already reviewed this item. You can edit or delete your review.");
      return;
    }

    const trimmedComment = comment.trim();

    if (!rating && !trimmedComment) {
      toast.error("Add a rating or comment");
      return;
    }

    handleReviewAction({
      method: "POST",
      endpoint: `/reviews/${id}`,
      body: {
        rating: rating || undefined,
        comment: trimmedComment || undefined,
      },
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
    const trimmedComment = editComment.trim();

    if (!editRating && !trimmedComment) {
      toast.error("Add a rating or comment");
      return;
    }

    handleReviewAction({
      method: "PATCH",
      endpoint: `/reviews/edit/${reviewId}`,
      body: {
        rating: editRating || undefined,
        comment: trimmedComment || undefined,
      },
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

  /* ---------- Likes / Dislikes ---------- */
  const reactToReview = async (reviewId, isLike, reviewUserId) => {
    if (reviewUserId === currentUserId) {
      toast.info("Cannot react to your own review");
      return;
    }

    setReviews((prev) =>
      prev.map((r) => {
        if (r.id !== reviewId) return r;

        let newUserReaction = r.user_reaction;
        let newLikes = r.total_likes;
        let newDislikes = r.total_dislikes;

        // Toggle logic
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

        return {
          ...r,
          user_reaction: newUserReaction,
          total_likes: newLikes,
          total_dislikes: newDislikes,
        };
      })
    );

    try {
      const res = await authFetch(`${config.API_BASE_URL}/reviews/${reviewId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_like: isLike }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to react");
      }

      const data = await res.json();

      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                total_likes: data.review.total_likes,
                total_dislikes: data.review.total_dislikes,
              }
            : r
        )
      );
    } catch (err) {
      toast.error(err.message || "Action failed");
      fetchItemAndReviews();
    }
  };

  if (loading) return <div className="item-details">Loading...</div>;
  if (!item) return <div className="item-details">Item not found</div>;

  // ---------------- Sort Reviews ----------------
  const sortedReviews = [...reviews].sort((a, b) => {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    return 0;
  });

  return (
    <div className="item-details">
      {/* ---------- Item Info ---------- */}
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

      {/* ---------- Add Review ---------- */}
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

      {/* ---------- Reviews Section ---------- */}
      <div className="reviews-section">
        <h3>Customer Reviews ({reviews.filter((r) => r.comment?.trim()).length})</h3>
        {sortedReviews.map((r) => (
          <div key={r.id} className="review-card">
            {editingReviewId === r.id ? (
              <>
                <StarRating value={editRating} onChange={setEditRating} />
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                />
                <div className="edit-buttons">
                  <button onClick={() => saveEdit(r.id)}>Save</button>
                  <button onClick={cancelEdit}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="review-header">
                  <span className="review-user">
                    {r.user_id === currentUserId ? (
                      <span className="you-badge">You</span>
                    ) : (
                      r.display_name
                    )}
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
                      👍 {r.total_likes || 0}
                    </button>
                    <button
                      onClick={() => reactToReview(r.id, false, r.user_id)}
                      className={r.user_reaction === false ? "active dislike-btn" : ""}
                    >
                      👎 {r.total_dislikes || 0}
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