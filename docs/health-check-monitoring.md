# Health Check Monitoring System

## Overview

This document outlines the health check monitoring system implemented in the Eleva Care application. We've consolidated our health monitoring into a single, robust endpoint that serves multiple purposes including CI/CD monitoring, QStash testing, and general API health verification.

## Endpoint Details

### Base Endpoint

```
/api/healthcheck
```

### Supported Methods

- `GET`: Returns comprehensive system health information
- `POST`: Handles QStash message testing

### Response Format

#### GET Response

```json
{
  "status": "healthy",
  "version": "x.x.x",
  "timestamp": "ISO-8601 timestamp",
  "uptime": "server uptime in seconds",
  "memory": {
    "used": "used memory in MB",
    "total": "total memory in MB",
    "free": "free memory in MB"
  },
  "environment": "development|staging|production",
  "nodeVersion": "current Node.js version",
  "platform": "operating system"
}
```

#### POST Response (QStash)

```json
{
  "success": true,
  "message": "QStash message received",
  "timestamp": "ISO-8601 timestamp"
}
```

## Integration Points

### CI/CD Monitoring

- Used in deployment verification
- No authentication required for basic health checks
- Monitors system availability and basic functionality

### QStash Integration

- Handles webhook verification
- Tests message processing functionality
- Verifies background job infrastructure

### System Monitoring

- Provides detailed system metrics
- Tracks memory usage and performance
- Reports environment-specific information

## Cron Jobs Overview

The following cron jobs are configured in our system:

1. Process Tasks

   - Schedule: Daily at 4 AM
   - Purpose: Background task processing

2. Expert Transfers

   - Schedule: Every 2 hours
   - Purpose: Process expert payment transfers

3. Upcoming Payouts

   - Schedule: Daily at noon
   - Purpose: Check and prepare upcoming payments

4. Reservation Cleanup

   - Schedule: Every 15 minutes
   - Purpose: Remove expired reservations

5. Blocked Dates Cleanup

   - Schedule: Daily at midnight
   - Purpose: Clean up expired blocked dates

6. Appointment Reminders

   - Schedule: Daily at 9 AM
   - Purpose: Send appointment notifications

7. Keep-alive
   - Schedule: Periodic
   - Purpose: Database health verification

## Best Practices

### Monitoring

1. Set up alerts for:
   - Response times > 1000ms
   - 5xx errors
   - Memory usage > 80%
   - Sustained high CPU usage

### Testing

1. Include health check in integration tests
2. Verify both GET and POST endpoints
3. Test error scenarios and recovery

### Security

1. Rate limiting implemented
2. No sensitive information in responses
3. Basic monitoring doesn't require authentication

## Future Enhancements

1. Enhanced metrics collection
2. Historical data tracking
3. Performance trending
4. Integration with additional monitoring services

## Troubleshooting

### Common Issues

1. Endpoint returns 5xx

   - Check server logs
   - Verify database connectivity
   - Check memory usage

2. Slow Response Times
   - Monitor system resources
   - Check database query performance
   - Verify network connectivity

### Support

For issues or questions, contact the DevOps team or create an issue in the project repository.
