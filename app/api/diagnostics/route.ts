/**
 * 🔍 Comprehensive System Diagnostics API
 *
 * This endpoint provides a complete health check of all system integrations:
 * - Novu configuration and workflow status
 * - QStash configuration and scheduled jobs
 * - Webhook endpoints health
 * - Database connectivity
 * - Environment variables validation
 * - Third-party service connectivity
 *
 * Usage: GET /api/diagnostics?component=all|novu|qstash|webhooks
 */
import { runNovuDiagnostics } from '@/app/utils/novu';
import { ENV_CONFIG } from '@/config/env';
import { db } from '@/drizzle/db';
import { getScheduleStats, isQStashAvailable } from '@/lib/qstash';
import {
  checkAllWebhooksHealth,
  generateWebhookHealthReport,
  getWebhookConfigStatus,
} from '@/lib/webhook-health';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ComponentHealth {
  status: string;
  [key: string]: unknown;
}

interface DiagnosticsResult {
  timestamp: string;
  status: 'healthy' | 'warning' | 'critical';
  components: {
    novu?: ComponentHealth;
    qstash?: ComponentHealth;
    webhooks?: ComponentHealth;
    database?: ComponentHealth;
    environment?: ComponentHealth;
  };
  summary: {
    total: number;
    healthy: number;
    warnings: number;
    critical: number;
  };
  recommendations: string[];
}

async function checkDatabaseHealth() {
  try {
    // Simple connectivity check
    await db.execute('SELECT 1');

    return {
      status: 'healthy' as const,
      connected: true,
      message: 'Database connection successful',
    };
  } catch (error) {
    return {
      status: 'critical' as const,
      connected: false,
      message: `Database connection failed: ${error}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkEnvironmentVariables() {
  const requiredVars = [
    'NEXT_PUBLIC_APP_URL',
    'DATABASE_URL',
    'CLERK_SECRET_KEY',
    'STRIPE_SECRET_KEY',
    'NOVU_SECRET_KEY',
  ];

  const optionalVars = [
    'QSTASH_TOKEN',
    'STRIPE_WEBHOOK_SECRET',
    'CLERK_WEBHOOK_SIGNING_SECRET',
    'REDIS_URL',
  ];

  const missing = requiredVars.filter((varName) => !ENV_CONFIG[varName as keyof typeof ENV_CONFIG]);
  const missingOptional = optionalVars.filter((varName) => !process.env[varName]);

  const status: 'healthy' | 'warning' | 'critical' = missing.length === 0 ? 'healthy' : 'critical';

  return {
    status,
    required: {
      total: requiredVars.length,
      configured: requiredVars.length - missing.length,
      missing,
    },
    optional: {
      total: optionalVars.length,
      configured: optionalVars.length - missingOptional.length,
      missing: missingOptional,
    },
    issues:
      missing.length > 0 ? [`Missing required environment variables: ${missing.join(', ')}`] : [],
    warnings:
      missingOptional.length > 0
        ? [`Missing optional environment variables: ${missingOptional.join(', ')}`]
        : [],
  };
}

async function runNovuDiagnosticsWrapper() {
  try {
    const diagnostics = await runNovuDiagnostics();
    return {
      status: diagnostics.summary.healthy ? 'healthy' : 'critical',
      ...diagnostics,
    };
  } catch (error) {
    return {
      status: 'critical',
      error: error instanceof Error ? error.message : 'Failed to run Novu diagnostics',
      initialized: false,
    };
  }
}

async function runQStashDiagnostics() {
  try {
    const stats = await getScheduleStats();
    const available = isQStashAvailable();

    const status: 'healthy' | 'warning' | 'critical' =
      available && stats.qstashAvailable ? (stats.isInSync ? 'healthy' : 'warning') : 'critical';

    return {
      status,
      available,
      ...stats,
      issues: !available
        ? ['QStash client not initialized']
        : !stats.isInSync
          ? ['Configured jobs and scheduled jobs are out of sync']
          : [],
      recommendations: !available
        ? ['Check QSTASH_TOKEN environment variable']
        : !stats.isInSync
          ? ['Run pnpm qstash:schedule to sync all jobs']
          : [],
    };
  } catch (error) {
    return {
      status: 'critical',
      error: error instanceof Error ? error.message : 'Failed to check QStash status',
      available: false,
    };
  }
}

async function runWebhookDiagnostics() {
  try {
    const baseUrl =
      ENV_CONFIG.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const results = await checkAllWebhooksHealth(baseUrl);
    const report = generateWebhookHealthReport(results);
    const configStatus = getWebhookConfigStatus();

    const status: 'healthy' | 'warning' | 'critical' =
      report.summary.unhealthy > 0
        ? 'critical'
        : report.summary.warnings > 0
          ? 'warning'
          : 'healthy';

    return {
      status,
      summary: report.summary,
      configuration: configStatus,
      endpoints: results,
      criticalIssues: report.criticalIssues,
      recommendations: report.recommendations,
    };
  } catch (error) {
    return {
      status: 'critical',
      error: error instanceof Error ? error.message : 'Failed to check webhook health',
    };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const component = searchParams.get('component') || 'all';
  const includeDetails = searchParams.get('details') === 'true';

  // Allow internal health checks (bypassing auth for diagnostics)
  // const isInternalHealthCheck = request.headers.get('x-internal-health-check') === 'true' ||
  //   request.headers.get('user-agent')?.includes('node') ||
  //   request.nextUrl.hostname === 'localhost';

  console.log(`🔍 Running diagnostics for: ${component}`);

  const result: DiagnosticsResult = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    components: {},
    summary: {
      total: 0,
      healthy: 0,
      warnings: 0,
      critical: 0,
    },
    recommendations: [],
  };

  try {
    // Run diagnostics based on component parameter
    if (component === 'all' || component === 'environment') {
      console.log('📊 Checking environment variables...');
      result.components.environment = await checkEnvironmentVariables();
    }

    if (component === 'all' || component === 'database') {
      console.log('🗄️ Checking database connectivity...');
      result.components.database = await checkDatabaseHealth();
    }

    if (component === 'all' || component === 'novu') {
      console.log('📧 Checking Novu integration...');
      result.components.novu = await runNovuDiagnosticsWrapper();
    }

    if (component === 'all' || component === 'qstash') {
      console.log('⏰ Checking QStash integration...');
      result.components.qstash = await runQStashDiagnostics();
    }

    if (component === 'all' || component === 'webhooks') {
      console.log('🔗 Checking webhook endpoints...');
      result.components.webhooks = await runWebhookDiagnostics();
    }

    // Calculate summary
    const componentStatuses = Object.values(result.components).map((comp) => comp.status);
    result.summary.total = componentStatuses.length;
    result.summary.healthy = componentStatuses.filter((s) => s === 'healthy').length;
    result.summary.warnings = componentStatuses.filter((s) => s === 'warning').length;
    result.summary.critical = componentStatuses.filter((s) => s === 'critical').length;

    // Determine overall status
    if (result.summary.critical > 0) {
      result.status = 'critical';
    } else if (result.summary.warnings > 0) {
      result.status = 'warning';
    } else {
      result.status = 'healthy';
    }

    // Collect recommendations
    Object.values(result.components).forEach((comp) => {
      if (comp && comp.recommendations && Array.isArray(comp.recommendations)) {
        result.recommendations.push(...comp.recommendations);
      }
    });

    // Remove duplicates
    result.recommendations = [...new Set(result.recommendations)];

    // Filter out detailed information if not requested
    if (!includeDetails) {
      Object.keys(result.components).forEach((key) => {
        const comp = result.components[key as keyof typeof result.components];
        if (comp && typeof comp === 'object') {
          // Keep only status and summary information
          const filtered: ComponentHealth = { status: comp.status };
          if (comp.summary) filtered.summary = comp.summary;
          if (comp.error) filtered.error = comp.error;
          if (comp.issues)
            filtered.issues = Array.isArray(comp.issues) ? comp.issues.slice(0, 3) : comp.issues;
          result.components[key as keyof typeof result.components] = filtered;
        }
      });
    }

    console.log(`✅ Diagnostics complete. Overall status: ${result.status}`);

    return NextResponse.json(result, {
      status: result.status === 'critical' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('❌ Diagnostics failed:', error);

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 'critical',
        error: error instanceof Error ? error.message : 'Diagnostics failed',
        components: result.components,
        summary: {
          total: 1,
          healthy: 0,
          warnings: 0,
          critical: 1,
        },
        recommendations: [
          'Check server logs for detailed error information',
          'Verify all environment variables are properly configured',
          'Ensure all required services are running',
        ],
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0',
        },
      },
    );
  }
}
