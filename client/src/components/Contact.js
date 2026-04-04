import React, { useState } from "react";
import "./Contact.css";

const Contact = ({ onBack }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
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

      const response = await fetch(`${apiBaseUrl}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Show success message
      const debugMail =
        window.location.hostname === "localhost" ||
        new URLSearchParams(window.location.search).has("debugMail");

      const baseMsg =
        data?.emailSent === false
          ? (data?.message || "Message received, but email delivery failed.")
          : (data?.message || "Thank you! Your message has been sent.");

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
          phone: "",
          subject: "",
          message: "",
        });
      }, 3000);
    } catch (err) {
      console.error("Error sending contact message:", err);
      setError(err.message || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-container">
        <button className="contact-back-btn" onClick={onBack}>
          ← Back to Home
        </button>
        
        <div className="contact-header">
          <h1 className="contact-title">Contact Us</h1>
          <p className="contact-subtitle">
            Have questions or need support? We're here to help!
          </p>
        </div>

        <div className="contact-content">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <div className="contact-info-item">
              <span className="contact-icon">📧</span>
              <div>
                <strong>Email</strong>
                <p>ucasa@testatozas.in</p>
              </div>
            </div>
            <div className="contact-info-item">
              <span className="contact-icon">🏢</span>
              <div>
                <strong>Company</strong>
                <p>AtoZ Automation Solutions Pvt. Ltd.</p>
              </div>
            </div>
            <div className="contact-info-item">
              <span className="contact-icon">🌐</span>
              <div>
                <strong>Website</strong>
                <p>www.atozas.com</p>
              </div>
            </div>
          </div>

          <div className="contact-form-container">
            <h2>Send us a Message</h2>
            {submitted ? (
              <div className="contact-success">
                <span className="success-icon">✓</span>
                <p>{successMessage || "Thank you! Your message has been sent."}</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="contact-error">
                    <span className="error-icon">⚠</span>
                    <p>{error}</p>
                  </div>
                )}
                <form className="contact-form" onSubmit={handleSubmit}>
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
                  <label htmlFor="phone">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 1234567890"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject *</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    placeholder="What is this regarding?"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="6"
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                <button 
                  type="submit" 
                  className="contact-submit-btn"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

