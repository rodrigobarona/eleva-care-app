/**
 * Email Performance Monitoring & Optimization
 * Tracks and optimizes email template performance
 */

export interface EmailPerformanceMetrics {
  templateId: string;
  renderTime: number; // milliseconds
  templateSize: number; // bytes
  assetLoadTime: number; // milliseconds
  deliveryRate: number; // percentage
  openRate: number; // percentage
  clickRate: number; // percentage
  crossClientCompatibility: ClientCompatibilityReport;
  accessibilityScore: number; // 0-100
  loadingPerformance: LoadingPerformance;
  timestamp: Date;
}

export interface ClientCompatibilityReport {
  gmail: CompatibilityResult;
  outlook: CompatibilityResult;
  appleMail: CompatibilityResult;
  yahoo: CompatibilityResult;
  thunderbird: CompatibilityResult;
  overallScore: number; // 0-100
}

export interface CompatibilityResult {
  rendering: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  recommendations: string[];
  score: number; // 0-100
}

export interface LoadingPerformance {
  firstContentfulPaint: number; // milliseconds
  largestContentfulPaint: number; // milliseconds
  cumulativeLayoutShift: number;
  totalBlockingTime: number; // milliseconds
}

export interface PerformanceReport {
  summary: {
    overallScore: number; // 0-100
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    recommendations: string[];
  };
  metrics: EmailPerformanceMetrics;
  benchmarks: {
    industry: EmailPerformanceMetrics;
    organization: EmailPerformanceMetrics;
  };
  trends: {
    period: '7d' | '30d' | '90d';
    data: EmailPerformanceMetrics[];
  };
}

export interface EmailOptimizationSuggestion {
  type: 'size' | 'images' | 'css' | 'accessibility' | 'compatibility';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: number; // percentage
}

/**
 * Email Performance Monitor Class
 */
export class EmailPerformanceMonitor {
  private metrics: Map<string, EmailPerformanceMetrics[]> = new Map();

  /**
   * Track template performance metrics
   */
  async trackTemplate(templateId: string, emailHtml: string): Promise<EmailPerformanceMetrics> {
    const startTime = performance.now();

    // Calculate template size
    const templateSize = new Blob([emailHtml]).size;

    // Simulate rendering time measurement
    const renderTime = performance.now() - startTime;

    // Analyze cross-client compatibility
    const compatibility = await this.analyzeClientCompatibility(emailHtml);

    // Analyze loading performance
    const loadingPerf = await this.analyzeLoadingPerformance(emailHtml);

    const metrics: EmailPerformanceMetrics = {
      templateId,
      renderTime,
      templateSize,
      assetLoadTime: loadingPerf.largestContentfulPaint,
      deliveryRate: 0, // Would be populated from actual delivery data
      openRate: 0, // Would be populated from tracking data
      clickRate: 0, // Would be populated from tracking data
      crossClientCompatibility: compatibility,
      accessibilityScore: 0, // Would integrate with accessibility validation
      loadingPerformance: loadingPerf,
      timestamp: new Date(),
    };

    // Store metrics
    if (!this.metrics.has(templateId)) {
      this.metrics.set(templateId, []);
    }
    this.metrics.get(templateId)!.push(metrics);

    return metrics;
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(
    templateId: string,
    period: '7d' | '30d' | '90d' = '30d',
  ): Promise<PerformanceReport> {
    const templateMetrics = this.metrics.get(templateId) || [];
    const latest = templateMetrics[templateMetrics.length - 1];

    if (!latest) {
      throw new Error(`No metrics found for template ${templateId}`);
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(latest);
    const grade = this.getPerformanceGrade(overallScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(latest);

    // Get trend data
    const periodMs = this.getPeriodInMs(period);
    const cutoffDate = new Date(Date.now() - periodMs);
    const trendData = templateMetrics.filter((m) => m.timestamp >= cutoffDate);

    return {
      summary: {
        overallScore,
        grade,
        recommendations,
      },
      metrics: latest,
      benchmarks: {
        industry: this.getIndustryBenchmarks(),
        organization: this.getOrganizationBenchmarks(),
      },
      trends: {
        period,
        data: trendData,
      },
    };
  }

  /**
   * Analyze cross-client compatibility
   */
  private async analyzeClientCompatibility(emailHtml: string): Promise<ClientCompatibilityReport> {
    // Simplified compatibility analysis
    // In production, this would integrate with actual testing services like Litmus or Email on Acid

    const analyzeClient = (clientName: string): CompatibilityResult => {
      const issues: string[] = [];
      const recommendations: string[] = [];
      let score = 100;

      // Check for common compatibility issues
      if (emailHtml.includes('display: flex')) {
        issues.push('Flexbox may not be supported in older Outlook versions');
        recommendations.push('Use table-based layouts for better Outlook compatibility');
        score -= 10;
      }

      if (emailHtml.includes('background-image')) {
        issues.push('Background images may not display in Outlook');
        recommendations.push('Use solid colors or inline images as fallbacks');
        score -= 5;
      }

      if (emailHtml.includes('@media')) {
        if (clientName === 'outlook') {
          issues.push('Media queries not supported in Outlook desktop');
          recommendations.push('Use conditional comments for Outlook-specific styles');
          score -= 15;
        }
      }

      const rendering: CompatibilityResult['rendering'] =
        score >= 90 ? 'excellent' : score >= 80 ? 'good' : score >= 70 ? 'fair' : 'poor';

      return { rendering, issues, recommendations, score };
    };

    const gmail = analyzeClient('gmail');
    const outlook = analyzeClient('outlook');
    const appleMail = analyzeClient('appleMail');
    const yahoo = analyzeClient('yahoo');
    const thunderbird = analyzeClient('thunderbird');

    const overallScore = Math.round(
      (gmail.score + outlook.score + appleMail.score + yahoo.score + thunderbird.score) / 5,
    );

    return {
      gmail,
      outlook,
      appleMail,
      yahoo,
      thunderbird,
      overallScore,
    };
  }

  /**
   * Analyze loading performance
   */
  private async analyzeLoadingPerformance(emailHtml: string): Promise<LoadingPerformance> {
    // Simplified performance analysis
    const imageCount = (emailHtml.match(/<img/g) || []).length;
    const cssSize = (emailHtml.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('').length;

    // Simulate performance metrics based on content analysis
    const firstContentfulPaint = Math.max(100, imageCount * 50 + cssSize / 100);
    const largestContentfulPaint = firstContentfulPaint * 1.5;
    const cumulativeLayoutShift = imageCount > 5 ? 0.1 : 0.05;
    const totalBlockingTime = cssSize > 10000 ? 100 : 50;

    return {
      firstContentfulPaint,
      largestContentfulPaint,
      cumulativeLayoutShift,
      totalBlockingTime,
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(metrics: EmailPerformanceMetrics): number {
    const weights = {
      renderTime: 0.2, // 20%
      templateSize: 0.15, // 15%
      compatibility: 0.25, // 25%
      accessibility: 0.2, // 20%
      loading: 0.2, // 20%
    };

    // Normalize scores (0-100)
    const renderScore = Math.max(0, 100 - metrics.renderTime / 10); // 1000ms = 0 points
    const sizeScore = Math.max(0, 100 - metrics.templateSize / 1000); // 100KB = 0 points
    const compatScore = metrics.crossClientCompatibility.overallScore;
    const accessScore = metrics.accessibilityScore;
    const loadingScore = Math.max(0, 100 - metrics.loadingPerformance.largestContentfulPaint / 50);

    return Math.round(
      renderScore * weights.renderTime +
        sizeScore * weights.templateSize +
        compatScore * weights.compatibility +
        accessScore * weights.accessibility +
        loadingScore * weights.loading,
    );
  }

  /**
   * Get performance grade based on score
   */
  private getPerformanceGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(metrics: EmailPerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.templateSize > 50000) {
      // 50KB
      recommendations.push('Optimize template size by reducing inline CSS and compressing images');
    }

    if (metrics.renderTime > 500) {
      // 500ms
      recommendations.push('Improve render time by simplifying template structure');
    }

    if (metrics.crossClientCompatibility.overallScore < 80) {
      recommendations.push('Enhance cross-client compatibility by using table-based layouts');
    }

    if (metrics.accessibilityScore < 85) {
      recommendations.push(
        'Improve accessibility by adding alt text and proper semantic structure',
      );
    }

    if (metrics.loadingPerformance.largestContentfulPaint > 1000) {
      recommendations.push('Optimize loading performance by lazy-loading images and reducing CSS');
    }

    return recommendations;
  }

  /**
   * Get industry benchmark data
   */
  private getIndustryBenchmarks(): EmailPerformanceMetrics {
    // Return industry standard benchmarks
    return {
      templateId: 'industry-benchmark',
      renderTime: 300,
      templateSize: 30000,
      assetLoadTime: 800,
      deliveryRate: 95,
      openRate: 22,
      clickRate: 3.5,
      crossClientCompatibility: {
        gmail: { rendering: 'good', issues: [], recommendations: [], score: 85 },
        outlook: { rendering: 'good', issues: [], recommendations: [], score: 80 },
        appleMail: { rendering: 'excellent', issues: [], recommendations: [], score: 95 },
        yahoo: { rendering: 'good', issues: [], recommendations: [], score: 85 },
        thunderbird: { rendering: 'good', issues: [], recommendations: [], score: 85 },
        overallScore: 86,
      },
      accessibilityScore: 85,
      loadingPerformance: {
        firstContentfulPaint: 600,
        largestContentfulPaint: 900,
        cumulativeLayoutShift: 0.1,
        totalBlockingTime: 100,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get organization benchmark data
   */
  private getOrganizationBenchmarks(): EmailPerformanceMetrics {
    // Calculate organization averages from stored metrics
    const allMetrics = Array.from(this.metrics.values()).flat();

    if (allMetrics.length === 0) {
      return this.getIndustryBenchmarks();
    }

    // Calculate averages
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      templateId: 'organization-benchmark',
      renderTime: avg(allMetrics.map((m) => m.renderTime)),
      templateSize: avg(allMetrics.map((m) => m.templateSize)),
      assetLoadTime: avg(allMetrics.map((m) => m.assetLoadTime)),
      deliveryRate: avg(allMetrics.map((m) => m.deliveryRate)),
      openRate: avg(allMetrics.map((m) => m.openRate)),
      clickRate: avg(allMetrics.map((m) => m.clickRate)),
      crossClientCompatibility: {
        gmail: { rendering: 'good', issues: [], recommendations: [], score: 85 },
        outlook: { rendering: 'good', issues: [], recommendations: [], score: 80 },
        appleMail: { rendering: 'excellent', issues: [], recommendations: [], score: 95 },
        yahoo: { rendering: 'good', issues: [], recommendations: [], score: 85 },
        thunderbird: { rendering: 'good', issues: [], recommendations: [], score: 85 },
        overallScore: avg(allMetrics.map((m) => m.crossClientCompatibility.overallScore)),
      },
      accessibilityScore: avg(allMetrics.map((m) => m.accessibilityScore)),
      loadingPerformance: {
        firstContentfulPaint: avg(allMetrics.map((m) => m.loadingPerformance.firstContentfulPaint)),
        largestContentfulPaint: avg(
          allMetrics.map((m) => m.loadingPerformance.largestContentfulPaint),
        ),
        cumulativeLayoutShift: avg(
          allMetrics.map((m) => m.loadingPerformance.cumulativeLayoutShift),
        ),
        totalBlockingTime: avg(allMetrics.map((m) => m.loadingPerformance.totalBlockingTime)),
      },
      timestamp: new Date(),
    };
  }

  /**
   * Convert period string to milliseconds
   */
  private getPeriodInMs(period: '7d' | '30d' | '90d'): number {
    const day = 24 * 60 * 60 * 1000;
    switch (period) {
      case '7d':
        return 7 * day;
      case '30d':
        return 30 * day;
      case '90d':
        return 90 * day;
    }
  }
}

/**
 * Generate optimization suggestions for email templates
 */
export function generateOptimizationSuggestions(
  metrics: EmailPerformanceMetrics,
): EmailOptimizationSuggestion[] {
  const suggestions: EmailOptimizationSuggestion[] = [];

  // Template size optimization
  if (metrics.templateSize > 50000) {
    suggestions.push({
      type: 'size',
      priority: 'high',
      description: 'Template size exceeds 50KB',
      impact: 'Slower loading times and potential delivery issues',
      implementation: 'Reduce inline CSS, compress images, minify HTML',
      estimatedImprovement: 25,
    });
  }

  // Image optimization
  const estimatedImageSize = metrics.templateSize * 0.6; // Assume 60% is images
  if (estimatedImageSize > 30000) {
    suggestions.push({
      type: 'images',
      priority: 'medium',
      description: 'Images contribute significantly to template size',
      impact: 'Improved loading performance and compatibility',
      implementation: 'Compress images, use WebP format where supported, implement lazy loading',
      estimatedImprovement: 15,
    });
  }

  // CSS optimization
  if (metrics.renderTime > 500) {
    suggestions.push({
      type: 'css',
      priority: 'medium',
      description: 'Render time is slower than optimal',
      impact: 'Faster email rendering and better user experience',
      implementation: 'Optimize CSS selectors, reduce complexity, use inline styles strategically',
      estimatedImprovement: 20,
    });
  }

  // Accessibility improvements
  if (metrics.accessibilityScore < 85) {
    suggestions.push({
      type: 'accessibility',
      priority: 'high',
      description: 'Accessibility score below recommended threshold',
      impact: 'Better user experience for all users, compliance with WCAG guidelines',
      implementation: 'Add alt text, improve semantic structure, enhance color contrast',
      estimatedImprovement: 30,
    });
  }

  // Cross-client compatibility
  if (metrics.crossClientCompatibility.overallScore < 80) {
    suggestions.push({
      type: 'compatibility',
      priority: 'high',
      description: 'Cross-client compatibility issues detected',
      impact: 'Consistent rendering across all email clients',
      implementation: 'Use table-based layouts, add Outlook-specific fixes, test thoroughly',
      estimatedImprovement: 25,
    });
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Singleton instance for global use
 */
export const emailPerformanceMonitor = new EmailPerformanceMonitor();
