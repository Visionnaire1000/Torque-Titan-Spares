import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import config from "../../config";
import "../../styles/itemDetails.css";

/* ---------- Decimal Star Rating Component ---------- */
const StarRating = ({ value = 0, size = 22}) => {
  const floor = Math.floor(Number(value));
  const decimal = Number(value) - floor;

  return (
    <div className="stars" style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        let width = 0;
        if (star <= floor) width = 100; // full star
        else if (star === floor + 1) width = Math.round(decimal * 100); // partial star
        else width = 0; // empty star

        return (
          <span
            key={star}
            className="admin-star"
            style={{
              fontSize: size,
              color: "#ddd",
              position: "relative",
            }}
          >
            ★
            {width > 0 && (
              <span
                style={{
                  position: "absolute",
                  overflow: "hidden",
                  width: `${width}%`,
                  color: "#ffc107",
                  top: 0,
                  left: 0,
                }}
              >
                ★
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
};

const AdminItemDetails = () => {
  const { id } = useParams();
  const { user, authFetch } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const currentUserId = user?.id;

  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItemAndReviews = async () => {
    setLoading(true);
    try {
      const itemRes = await authFetch(`${config.API_BASE_URL}/spareparts/${id}`);
      if (!itemRes.ok) throw new Error("Item not found");
      const itemData = await itemRes.json();

      const reviewsRes = await authFetch(`${config.API_BASE_URL}/admin/reviews/sparepart/${id}`);
      const reviewData = reviewsRes.ok ? await reviewsRes.json() : [];

      const reviewsWithReaction = Array.isArray(reviewData)
        ? reviewData.map((r) => {
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
              comment: r.comment || r.text || "",
            };
          })
        : [];

      setItem(itemData);
      setReviews(reviewsWithReaction);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load item details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemAndReviews();
  }, [id]);

  if (loading) return <div className="item-details">Loading...</div>;
  if (!item) return <div className="item-details">Item not found</div>;

  const averageRating = item?.average_rating ? Number(item.average_rating) : 0;

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
              {averageRating.toFixed(1)} ({reviews.filter((r) => r.comment?.trim()).length})
            </span>
          </div>
        </div>
      </div>

      <div className="admin-reviews-section">
        <h3>
          Customer Reviews ({reviews.filter((r) => r.comment?.trim()).length})
        </h3>

        {reviews.length === 0 && <p>No reviews yet.</p>}

        {reviews.map((r) => (
          <div key={r.id} className="review-card">
            <div className="review-header">
              <span className="review-user">
                {r.user_id === currentUserId ? <span className="you-badge">You</span> : r.display_name}
              </span>
              <span className="review-date">
                {r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : ""}
              </span>
            </div>

            <StarRating value={r.rating || 0} readonly size={20} />

            {r.comment && <p className="review">{r.comment}</p>}

            <div className="review-reactions">
              {isAdmin ? (
                <>👍 {r.total_likes || 0} | 👎 {r.total_dislikes || 0}</>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminItemDetails;