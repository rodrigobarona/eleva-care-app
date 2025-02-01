import React, { useState } from "react";
import { useRouter } from "next/router";

const MeetingForm: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [price, setPrice] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [date, setDate] = useState("");
  const [timezone, setTimezone] = useState("");
  const [eventId, setEventId] = useState("");
  const [username, setUsername] = useState("");
  const [eventSlug, setEventSlug] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate required fields
    if (
      !price ||
      !guestEmail ||
      !guestName ||
      !startTime ||
      !date ||
      !timezone ||
      !eventId ||
      !username ||
      !eventSlug
    ) {
      console.error("Missing required fields:", {
        price,
        guestEmail,
        guestName,
        startTime,
        date,
        timezone,
        eventId,
        username,
        eventSlug,
      });
      setError("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    try {
      const meetingData = {
        guestName,
        guestEmail,
        startTime,
        date,
        timezone,
      };

      console.log("Creating checkout session with:", {
        price: Number(price),
        meetingData,
        eventId,
        username,
        eventSlug,
      });

      // Create checkout session
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: Number(price) * 100, // Convert to cents
          eventId,
          meetingData,
          username,
          eventSlug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Checkout session creation failed:", data);
        throw new Error(data.message || "Failed to create checkout session");
      }

      console.log("Checkout session created:", data);

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout setup failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to setup checkout. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return <div>{/* Render your form here */}</div>;
};

export default MeetingForm;
