"use client";

import { useState, type FormEvent } from "react";
import * as React from "react";

interface MeetingFormProps {
  defaultPrice?: number;
  defaultEventId?: string;
  defaultUsername?: string;
  defaultEventSlug?: string;
}

export default function MeetingForm({
  defaultPrice = 0,
  defaultEventId = "",
  defaultUsername = "",
  defaultEventSlug = "",
}: MeetingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [price] = useState(defaultPrice);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [date, setDate] = useState("");
  const [timezone, setTimezone] = useState("");
  const [eventId] = useState(defaultEventId);
  const [username] = useState(defaultUsername);
  const [eventSlug] = useState(defaultEventSlug);

  const handleSubmit = async (e: FormEvent) => {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="guestName" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="guestName"
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="guestEmail" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="guestEmail"
          type="email"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="date" className="block text-sm font-medium">
          Date
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="startTime" className="block text-sm font-medium">
          Time
        </label>
        <input
          id="startTime"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="timezone" className="block text-sm font-medium">
          Timezone
        </label>
        <input
          id="timezone"
          type="text"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Processing..." : "Continue to Payment"}
      </button>
    </form>
  );
}
