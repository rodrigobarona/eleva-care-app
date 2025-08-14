# Booking Layout Preview

This is a text representation of how the new booking layout will look:

```
┌─────────────────────┬──────────────────────────────────┬─────────────────────────┐
│                     │                                  │                         │
│  ●                  │    MARCH 2025                    │  Wed 12                 │
│  Expert Name        │    ┌───┬───┬───┬───┬───┬───┬───┐ │                         │
│                     │    │Sun│Mon│Tue│Wed│Thu│Fri│Sat│ │  ┌─────┐  ┌─────┐       │
│  Consultation Title │    ├───┼───┼───┼───┼───┼───┼───┤ │  │ 12h │  │ 24h │       │
│                     │    │   │   │   │   │   │   │ 1 │ │  └─────┘  └─────┘       │
│  Lorem ipsum dolor  │    ├───┼───┼───┼───┼───┼───┼───┤ │                         │
│  sit amet,          │    │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ │  ┌─────────────────────┐│
│  consectetur        │    ├───┼───┼───┼───┼───┼───┼───┤ │  │      9:00 am        ││
│  adipiscing elit.   │    │ 9 │10 │11 │12*│13 │14 │15 │ │  └─────────────────────┘│
│                     │    ├───┼───┼───┼───┼───┼───┼───┤ │                         │
│                     │    │16 │17 │18 │19 │20 │21 │22 │ │  ┌─────────────────────┐│
│  ⏱️ 45m             │    ├───┼───┼───┼───┼───┼───┼───┤ │  │      9:30 am        ││
│                     │    │23 │24 │25 │26 │27 │28 │29 │ │  └─────────────────────┘│
│  📍 Google Meet     │    ├───┼───┼───┼───┼───┼───┼───┤ │                         │
│                     │    │30 │31 │   │   │   │   │   │ │  ┌─────────────────────┐│
│  💳 $70.00          │    └───┴───┴───┴───┴───┴───┴───┘ │  │     10:00 am        ││
│                     │                                  │  └─────────────────────┘│
│  🌎 America/Los     │                                  │                         │
│     Angeles         │                                  │  ┌─────────────────────┐│
│                     │                                  │  │     10:30 am        ││
│                     │                                  │  └─────────────────────┘│
│                     │                                  │                         │
│                     │                                  │       (more slots)      │
│                     │                                  │                         │
└─────────────────────┴──────────────────────────────────┴─────────────────────────┘
```

## Key Features

1. **Left Panel (Expert Info)**
   - Expert avatar and name
   - Event title and description
   - Key details (duration, location, price)
   - Current timezone

2. **Middle Panel (Calendar)**
   - Month and year display with navigation
   - Day of week headers
   - Calendar grid with available dates
   - Today and selected date indicators

3. **Right Panel (Time Slots)**
   - Selected date display
   - 12h/24h format toggle
   - Scrollable list of available time slots
   - Clear visual indicators for selection

The design maintains a clean, modern aesthetic while providing a familiar and intuitive booking experience. The three-panel layout makes it easy for users to see all relevant information at once without scrolling.

## Mobile Responsiveness

On smaller screens, the layout will stack vertically:

```
┌─────────────────────┐
│                     │
│  ●                  │
│  Expert Name        │
│                     │
│  Consultation Title │
│                     │
│  ⏱️ 45m   📍 Meet   │
│  💳 $70   🌎 LA     │
└─────────────────────┘
┌─────────────────────┐
│    MARCH 2025       │
│  ┌───┬───┬───┬───┐  │
│  │Mon│Tue│Wed│Thu│  │
│  ├───┼───┼───┼───┤  │
│  │ 4 │ 5 │ 6 │ 7 │  │
│  └───┴───┴───┴───┘  │
└─────────────────────┘
┌─────────────────────┐
│  Wed 12   ┌─┐ ┌─┐   │
│           │A│ │B│   │
│           └─┘ └─┘   │
│                     │
│  ┌─────────────┐    │
│  │  9:00 am    │    │
│  └─────────────┘    │
│                     │
│  ┌─────────────┐    │
│  │  9:30 am    │    │
│  └─────────────┘    │
│                     │
└─────────────────────┘
```
