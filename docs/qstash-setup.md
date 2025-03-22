# QStash Setup Guide

This guide provides step-by-step instructions for setting up QStash integration in the Eleva Care application.

## Prerequisites

1. An Upstash account (create one at [upstash.com](https://upstash.com/) if you don't have one)
2. Access to the Upstash QStash dashboard
3. Node.js and npm installed

## Getting Your QStash Credentials

1. Log in to your [Upstash Console](https://console.upstash.com/)
2. Select "QStash" from the left sidebar
3. If you don't have a QStash instance, create one
4. Once in the QStash dashboard, find the following credentials:
   - **QStash Token**: Used for sending messages
   - **Current Signing Key**: Used for verifying incoming messages
   - **Next Signing Key**: Used for verifying messages after key rotation

## Setting Up Environment Variables

### Option 1: Automatic Setup (Recommended)

Run the environment setup utility:

```bash
npm run qstash:env
```

This interactive script will:

1. Check for existing QStash environment variables
2. Prompt you for any missing variables
3. Create or update a `.env.local` file with the new variables

### Option 2: Manual Setup

Add the following to your `.env.local` file:

```
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key
QSTASH_URL=https://qstash.upstash.io
```

## Verifying Setup

After setting up the environment variables, verify that everything is configured correctly:

```bash
npm run qstash:check
```

This will check for the presence of required environment variables and display their status.

For a more in-depth check, run:

```bash
npm run qstash:debug
```

This will provide detailed information about environment variable loading, including checking the contents of your `.env` file.

## Testing QStash Connection

To test the connection to QStash by sending a test message:

```bash
npm run qstash:test
```

This will:

1. Connect to QStash
2. List any existing schedules
3. Send a test message to your application's health check endpoint

## Setting Up Schedules

To set up or update QStash schedules based on your application's configuration:

```bash
npm run qstash:update
```

This will:

1. Read the schedule configuration from `config/qstash.ts`
2. Create or update schedules in QStash
3. Display a summary of the results

## Troubleshooting

### Environment Variables Not Loading

If environment variables are not loading correctly:

1. Check that your `.env` or `.env.local` file exists in the root directory
2. Verify variable names match exactly (`QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`)
3. Run `npm run qstash:debug` to diagnose environment loading issues
4. Try running `npm run qstash:env` to set up the variables interactively

### Connection Issues

If you can't connect to QStash:

1. Check your internet connection
2. Verify your QStash token is correct
3. Ensure your QStash account is active
4. Check if there are any service outages at [Upstash Status](https://status.upstash.com/)

### Schedule Creation Failures

If schedules fail to create:

1. Check that your application's base URL is correctly set in `config/qstash.ts`
2. Verify that the endpoints specified in your schedules exist
3. Check for any error messages in the console output

## Additional Resources

- [QStash Documentation](https://docs.upstash.com/qstash)
- [Eleva Care QStash Integration Guide](./qstash-integration.md)
- [Upstash Console](https://console.upstash.com/)

## Command Reference

| Command                 | Description                         |
| ----------------------- | ----------------------------------- |
| `npm run qstash:env`    | Set up QStash environment variables |
| `npm run qstash:check`  | Check QStash environment variables  |
| `npm run qstash:debug`  | Debug environment variable loading  |
| `npm run qstash:test`   | Test QStash connection              |
| `npm run qstash:update` | Set up or update QStash schedules   |
