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
            style={{ fontSize: size, cursor: readonly ? "default" : "pointer" }}
            onClick={() => handleClick(star)}
          >
            {starClass === "half" ? "⯨" : "★"}
          </span>
        );
      })}
    </div>
  );
};

const ItemDetails = () => {
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

      const reviewsWithUserReaction = reviewData.map((r) => {
        const userReaction = r.likes?.find((l) => l.user_id === currentUserId);
        return {
          ...r,
          user_reaction: userReaction ? (userReaction.is_like ? "like" : "dislike") : null,
        };
      });

      setItem(itemData);
      setReviews(reviewsWithUserReaction);
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

  const refreshItem = async () => {
    try {
      const res = await fetch(`${config.API_BASE_URL}/spareparts/${id}`);
      if (!res.ok) throw new Error("Failed to refresh item");
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
      console.error(err);
      toast.error(err.message || "Action failed");
    }
  };

  /* ---------- Review CRUD ---------- */
  const submitReview = () => {
    const trimmedComment = comment.trim();
    if ((rating || 0) <= 0 && trimmedComment.length === 0) {
      toast.error("Add a rating or comment");
      return;
    }

    handleReviewAction({
      method: "POST",
      endpoint: `/reviews/${id}`,
      body: { rating: rating || undefined, comment: trimmedComment || undefined },
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
    if ((editRating || 0) <= 0 && trimmedComment.length === 0) {
      toast.error("Add a rating or comment");
      return;
    }

    handleReviewAction({
      method: "PATCH",
      endpoint: `/reviews/edit/${reviewId}`,
      body: { rating: editRating || undefined, comment: trimmedComment || undefined },
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

  /* ---------- Likes/Dislikes Toggle ---------- */
  const reactToReview = (reviewId, isLike, reviewUserId) => {
    if (!reviewId) return toast.error("Review ID missing");
    if (reviewUserId === currentUserId) return toast.info("Cannot react to your own review");

    setReviews((prev) =>
      prev.map((r) => {
        if (r.id !== reviewId) return r;

        let likes = Number(r.total_likes || 0);
        let dislikes = Number(r.total_dislikes || 0);

        switch (r.user_reaction) {
          case "like":
            if (isLike) return { ...r, total_likes: Math.max(0, likes - 1), user_reaction: null };
            return {
              ...r,
              total_likes: Math.max(0, likes - 1),
              total_dislikes: dislikes + 1,
              user_reaction: "dislike",
            };

          case "dislike":
            if (!isLike) return { ...r, total_dislikes: Math.max(0, dislikes - 1), user_reaction: null };
            return {
              ...r,
              total_dislikes: Math.max(0, dislikes - 1),
              total_likes: likes + 1,
              user_reaction: "like",
            };

          default:
            if (isLike) likes += 1;
            else dislikes += 1;
            return { ...r, total_likes: likes, total_dislikes: dislikes, user_reaction: isLike ? "like" : "dislike" };
        }
      })
    );

    // Send to backend
    handleReviewAction({
      method: "POST",
      endpoint: `/reviews/${reviewId}/react`,
      body: { is_like: isLike },
      updateFn: (updatedReview) =>
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? { ...r, ...updatedReview, user_reaction: isLike ? "like" : "dislike" }
              : r
          )
        ),
    });
  };

  if (loading) return <div className="item-details">Loading...</div>;
  if (!item) return <div className="item-details">Item not found</div>;

  return (
    <div className="item-details">
      {/* ---------- Item Info ---------- */}
      <div className="item-main">
        <img src={item.image} alt={item.brand} />
        <div className="item-info">
          <h2>
            {item.brand} {item.category} for {item.vehicle_type} 
          </h2>
           <p id='price'>
                KES {item.buying_price?.toLocaleString() || '0'}
                {item.discount_percentage > 0 && (
                  <span id="discount">
                    (-{item.discount_percentage.toFixed(0)}%)
                  </span>
                )}
            </p>

          {/* ---------- Average Rating ---------- */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <StarRating value={averageRating} readonly size={22} />
            <span>{averageRating.toFixed(1)}</span>
          </div>

          <button onClick={() => addItem(item)}>Add To Cart</button>
        </div>
      </div>

      {/* ---------- Add Review ---------- */}
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

      {/* ---------- Reviews ---------- */}
      <div className="reviews-section">
        <h3>Customer Reviews</h3>
        <p className="muted">
          {reviews.length} review{reviews.length !== 1 ? "s" : ""}
        </p>
        {reviews.length === 0 && <p className="muted">No reviews yet.</p>}

        {reviews.map((r) => (
          <div key={r.id} className="review-card">
            {editingReviewId === r.id ? (
              <>
                <StarRating value={editRating} onChange={setEditRating} />
                <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} />
                <button onClick={() => saveEdit(r.id)}>Save</button>
                <button onClick={cancelEdit}>Cancel</button>
              </>
            ) : (
              <>
                <StarRating value={r.rating || 0} readonly size={20} />
                {r.comment && <p className="comment">{r.comment}</p>}

                <div className="review-actions" style={{ display: "flex", flexDirection: "column" }}>
                  {r.user_id === currentUserId ? (
                    <>
                      <button onClick={() => startEdit(r)}>Edit</button>
                      <button onClick={() => deleteReview(r.id)}>Delete</button>
                    </>
                  ) : (
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <button
                          onClick={() => reactToReview(r.id, true, r.user_id)}
                          style={{ fontWeight: r.user_reaction === "like" ? "bold" : "normal" }}
                        >
                          👍 {r.total_likes || 0}
                        </button>
                        <span className="muted" style={{ fontSize: 12 }}>
                          Total likes
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <button
                          onClick={() => reactToReview(r.id, false, r.user_id)}
                          style={{ fontWeight: r.user_reaction === "dislike" ? "bold" : "normal" }}
                        >
                          👎 {r.total_dislikes || 0}
                        </button>
                        <span className="muted" style={{ fontSize: 12 }}>
                          Total dislikes
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemDetails;
