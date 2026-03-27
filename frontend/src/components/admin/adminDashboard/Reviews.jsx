import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { Link } from "react-router-dom";
import config from "../../../config";
import "../../../styles/admin/reviews.css";

const Reviews = () => {
  const { authFetch, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // keep a ref to the latest reviews to compare during polling
  const reviewsRef = useRef([]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); 
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fetchReviews = async () => {
    if (!user) {
      setError("Unauthorized");
      setLoading(false);
      return;
    }

    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/reviews`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch reviews");
      }

      const data = await res.json();

      // Only update state if data changed
      const isDifferent =
        data.length !== reviewsRef.current.length ||
        data.some(
          (r, i) =>
            r.id !== reviewsRef.current[i]?.id ||
            r.created_at !== reviewsRef.current[i]?.created_at
        );

      if (isDifferent) {
        setReviews(data);
        reviewsRef.current = data; // update the ref
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(); // initial fetch

    // set up 30-second polling
    const interval = setInterval(fetchReviews, 30000);

    return () => clearInterval(interval); // cleanup on unmount
  }, [user, authFetch]);

  // store last seen review timestamp in localStorage
  useEffect(() => {
    if (reviews.length > 0) {
      localStorage.setItem("lastSeenReviewTimestamp", reviews[0].created_at);
    }
  }, [reviews]);

  if (loading) return <p>Loading reviews...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!reviews.length) return <p>No reviews yet.</p>;

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

            <div className="review-header">
              {typeof r.rating === "number" && (
                <span className="review-rating">
                  {"⭐".repeat(r.rating)} ({r.rating})
                </span>
              )}
            </div>

            {r.comment && <p className="review-comment">{r.comment}</p>}

            <div className="review-reactions">
              <span className="likes">👍 {r.total_likes}</span>
              <span className="dislikes">👎 {r.total_dislikes}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default Reviews;