import React, { useState } from "react";
import "./Feedback.css";

const Feedback = ({ onBack }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    feedbackType: "general",
    rating: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Determine API base URL.
      // IMPORTANT: CRA env vars are baked at build-time. In production we prefer same-origin
      // so the deployed frontend always talks to the same domain automatically.
      // Local dev: default to local backend (no proxy configured in client/package.json).
      // Production: same-origin.
      const rawApiBaseUrl =
        process.env.REACT_APP_API_URL ||
        (window.location.hostname === "localhost"
          ? "http://localhost:5000"
          : window.location.origin);
      const apiBaseUrl = (rawApiBaseUrl || "").replace(/\/+$/, "");

      const response = await fetch(`${apiBaseUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      // Show success message
      const debugMail =
        window.location.hostname === "localhost" ||
        new URLSearchParams(window.location.search).has("debugMail");

      const baseMsg =
        data?.emailSent === false
          ? (data?.message || "Feedback received, but email delivery failed.")
          : (data?.message || "Your feedback has been received. Thank you!");

      const debugDetails =
        debugMail && data?.emailSent === false
          ? `\n\nEmail To: ${data?.emailTo || "unknown"}\nError: ${data?.emailError || "unknown"}`
          : "";

      setSuccessMessage(`${baseMsg}${debugDetails}`);
      setSubmitted(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          name: "",
          email: "",
          feedbackType: "general",
          rating: "",
          message: "",
        });
      }, 3000);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setError(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feedback-page">
      <div className="feedback-container">
        <button className="feedback-back-btn" onClick={onBack}>
          ← Back to Home
        </button>
        
        <div className="feedback-header">
          <h1 className="feedback-title">Feedback</h1>
          <p className="feedback-subtitle">
            We value your opinion! Help us improve UCASA App by sharing your feedback.
          </p>
        </div>

        <div className="feedback-content">
          {submitted ? (
            <div className="feedback-success">
              <span className="success-icon">✓</span>
              <h2>Thank You!</h2>
              <p>{successMessage || "Your feedback has been received. We appreciate your input!"}</p>
            </div>
            ) : (
            <>
              {error && (
                <div className="feedback-error">
                  <span className="error-icon">⚠</span>
                  <p>{error}</p>
                </div>
              )}
              <form className="feedback-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Your full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="feedbackType">Feedback Type *</label>
                <select
                  id="feedbackType"
                  name="feedbackType"
                  value={formData.feedbackType}
                  onChange={handleChange}
                  required
                >
                  <option value="general">General Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="ui">UI/UX Suggestion</option>
                  <option value="performance">Performance Issue</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="rating">Overall Rating</label>
                <div className="rating-buttons">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      className={`rating-btn ${formData.rating === rating.toString() ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, rating: rating.toString() }))}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="message">Your Feedback *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="8"
                  placeholder="Please share your thoughts, suggestions, or report any issues you've encountered..."
                />
              </div>

              <button 
                type="submit" 
                className="feedback-submit-btn"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Feedback"}
              </button>
            </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Feedback;

