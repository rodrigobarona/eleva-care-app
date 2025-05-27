-- Convert any existing booking window values from months to days
UPDATE scheduling_settings
SET booking_window_days = 
  CASE 
    WHEN booking_window_days < 7 THEN booking_window_days * 30 -- Convert months to days
    ELSE booking_window_days -- Already in days, leave as is
  END
WHERE booking_window_days < 7; -- Only convert values that are likely in months (less than a week) 