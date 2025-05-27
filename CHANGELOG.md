# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Enhanced scheduling settings with buffer time management:
  - New buffer time settings for before and after meetings
  - Default 10-minute buffer before meetings
  - Configurable buffer times from "no buffer" up to 2 hours
  - Buffer times are reflected in calendar availability
  - Visual feedback of total meeting duration including buffers
- Improved booking form with buffer time integration:
  - Shows buffer times in meeting confirmation
  - Prevents double bookings including buffer periods
  - Respects user-configured buffer preferences
- Other scheduling configurations:
  - Minimum notice period settings
  - Time slot interval settings
  - Booking window configuration
  - Clear explanations for each setting

### Changed

- Updated meeting scheduling logic to account for buffer times
- Modified calendar availability calculations to include buffer periods
- Improved user interface for scheduling settings with clear descriptions

### Technical

- Added buffer time validation in scheduling settings form
- Enhanced `getValidTimesFromSchedule` to handle buffer times
- Updated database schema to include buffer time settings
- Added proper TypeScript types for scheduling settings
