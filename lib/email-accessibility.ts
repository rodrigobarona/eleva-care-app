/**
 * Email Accessibility Utilities
 * Ensures WCAG 2.1 AA compliance for email templates
 */

export interface AccessibilityConfig {
  enableScreenReader: boolean;
  enforceContrast: boolean;
  requireAltText: boolean;
  validateSemantics: boolean;
  highContrastMode: boolean;
}

export interface AccessibilityReport {
  score: number; // 0-100
  issues: AccessibilityIssue[];
  recommendations: string[];
  wcagLevel: 'A' | 'AA' | 'AAA' | 'FAIL';
}

export interface AccessibilityIssue {
  type:
    | 'contrast'
    | 'alt-text'
    | 'semantic'
    | 'focus'
    | 'aria'
    | 'color-contrast'
    | 'missing-alt-text'
    | 'empty-link';
  severity: 'low' | 'medium' | 'high' | 'critical' | 'error';
  element: string;
  description?: string;
  recommendation?: string;
  message?: string;
  suggestions?: string[];
}

export interface ColorContrastRatio {
  ratio: number;
  level: 'AA' | 'AAA' | 'FAIL';
  normalText: boolean;
  largeText: boolean;
}

/**
 * Calculate color contrast ratio between two colors
 * WCAG 2.1 AA requires 4.5:1 for normal text, 3:1 for large text
 */
export function calculateContrastRatio(foreground: string, background: string): ColorContrastRatio {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance
    const sRGB = [r, g, b].map((value) => {
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };

  const lum1 = getLuminance(foreground);
  const lum2 = getLuminance(background);
  const ratio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    level: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'FAIL',
    normalText: ratio >= 4.5,
    largeText: ratio >= 3,
  };
}

/**
 * Validate email accessibility compliance
 */
export function validateEmailAccessibility(
  emailHtml: string,
  config: AccessibilityConfig,
): AccessibilityReport {
  const issues: AccessibilityIssue[] = [];
  const recommendations: string[] = [];

  // Parse HTML for validation (simplified version)
  const parser = new DOMParser();
  const doc = parser.parseFromString(emailHtml, 'text/html');

  // Check for missing alt text on images
  if (config.requireAltText) {
    const images = doc.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.getAttribute('alt') && !img.getAttribute('aria-hidden')) {
        issues.push({
          type: 'alt-text',
          severity: 'high',
          element: `img[${index}]`,
          description: 'Image missing alt text',
          recommendation:
            'Add descriptive alt text or use aria-hidden="true" for decorative images',
        });
      }
    });
  }

  // Check semantic structure
  if (config.validateSemantics) {
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      issues.push({
        type: 'semantic',
        severity: 'medium',
        element: 'document',
        description: 'No heading structure found',
        recommendation: 'Use proper heading hierarchy (h1, h2, h3, etc.)',
      });
    }

    // Check for proper heading hierarchy
    let lastLevel = 0;
    headings.forEach((heading, index) => {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      if (currentLevel > lastLevel + 1) {
        issues.push({
          type: 'semantic',
          severity: 'medium',
          element: `${heading.tagName.toLowerCase()}[${index}]`,
          description: 'Heading hierarchy skip detected',
          recommendation: 'Use sequential heading levels (h1, h2, h3, etc.)',
        });
      }
      lastLevel = currentLevel;
    });
  }

  // Check ARIA attributes
  const elementsWithAria = doc.querySelectorAll('[aria-label], [aria-describedby], [aria-hidden]');
  elementsWithAria.forEach((element, index) => {
    const elementAriaLabel = element.getAttribute('aria-label');
    const ariaDescribedBy = element.getAttribute('aria-describedby');

    // Check for empty aria-label
    if (elementAriaLabel === '') {
      issues.push({
        type: 'aria',
        severity: 'medium',
        element: `${element.tagName.toLowerCase()}[${index}]`,
        description: 'Empty aria-label attribute',
        recommendation: 'Provide a descriptive aria-label or remove the attribute',
      });
    }

    if (ariaDescribedBy) {
      const describedByElement = doc.getElementById(ariaDescribedBy);
      if (!describedByElement) {
        issues.push({
          type: 'aria',
          severity: 'medium',
          element: `${element.tagName.toLowerCase()}[${index}]`,
          description: `aria-describedby references non-existent element "${ariaDescribedBy}"`,
          recommendation: 'Ensure aria-describedby references an existing element ID',
        });
      }
    }
  });

  // Calculate overall score
  const maxScore = 100;
  const deductionPerIssue = {
    low: 2,
    medium: 5,
    high: 10,
    critical: 20,
    error: 15,
  };

  let totalDeduction = 0;
  issues.forEach((issue) => {
    totalDeduction += deductionPerIssue[issue.severity];
  });

  const score = Math.max(0, maxScore - totalDeduction);

  // Determine WCAG level
  let wcagLevel: 'A' | 'AA' | 'AAA' | 'FAIL';
  if (score >= 95) wcagLevel = 'AAA';
  else if (score >= 85) wcagLevel = 'AA';
  else if (score >= 70) wcagLevel = 'A';
  else wcagLevel = 'FAIL';

  // Add general recommendations
  if (issues.length > 0) {
    recommendations.push('Review and fix accessibility issues to improve compliance');
  }
  if (score < 90) {
    recommendations.push('Consider implementing additional accessibility features');
  }

  return {
    score,
    issues,
    recommendations,
    wcagLevel,
  };
}

/**
 * Generate accessible color palette for email themes
 */
export function generateAccessibleColorPalette(
  baseColor: string,
  highContrast = false,
): Record<string, string> {
  const contrastThreshold = highContrast ? 7 : 4.5;

  // This is a simplified version - in production, you'd use a more sophisticated color generation algorithm
  return {
    primary: baseColor,
    secondary: '#4A5568',
    background: '#FFFFFF',
    text: '#1A202C',
    muted: '#718096',
    accent: adjustColorContrast(baseColor, contrastThreshold),
  };
}

/**
 * Adjust color to meet contrast requirements
 */
function adjustColorContrast(color: string, requiredRatio: number): string {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate current contrast ratio
  const currentRatio = calculateContrastRatio(color, '#FFFFFF').ratio;

  // If we already meet the required ratio, return the original color
  if (currentRatio >= requiredRatio) {
    return color;
  }

  // Adjust brightness until we meet the required ratio
  let factor = 1.0;
  while (calculateContrastRatio(color, '#FFFFFF').ratio < requiredRatio && factor > 0) {
    factor -= 0.1;
    const newR = Math.max(0, Math.min(255, Math.round(r * factor)));
    const newG = Math.max(0, Math.min(255, Math.round(g * factor)));
    const newB = Math.max(0, Math.min(255, Math.round(b * factor)));
    color = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB
      .toString(16)
      .padStart(2, '0')}`;
  }

  return color;
}

/**
 * Generate ARIA labels for common email elements
 */
export function generateAriaLabel(elementType: string, content?: string, context?: string): string {
  const baseLabel = `${elementType}${content ? `: ${content}` : ''}`;
  return context ? `${baseLabel} (${context})` : baseLabel;
}

/**
 * Default accessibility configuration for Eleva Care emails
 */
export const defaultAccessibilityConfig: AccessibilityConfig = {
  enableScreenReader: true,
  enforceContrast: true,
  requireAltText: true,
  validateSemantics: true,
  highContrastMode: false,
};

/**
 * High contrast accessibility configuration
 */
export const highContrastAccessibilityConfig: AccessibilityConfig = {
  enableScreenReader: true,
  enforceContrast: true,
  requireAltText: true,
  validateSemantics: true,
  highContrastMode: true,
};

export function validateColorContrast(
  foreground: string,
  background: string,
  requiredRatio = 4.5,
): AccessibilityReport {
  const contrast = calculateContrastRatio(foreground, background);
  const meetsWCAG = contrast.ratio >= requiredRatio;

  return {
    score: meetsWCAG ? 100 : Math.round((contrast.ratio / requiredRatio) * 100),
    issues: meetsWCAG
      ? []
      : [
          {
            type: 'color-contrast',
            severity: 'high',
            message: `Color contrast ratio ${contrast.ratio.toFixed(2)} is below WCAG AA requirement of ${requiredRatio}`,
            element: 'color-pair',
            suggestions: ['Increase contrast between foreground and background colors'],
          },
        ],
    recommendations: meetsWCAG ? [] : ['Consider using darker text or lighter background colors'],
    wcagLevel: meetsWCAG ? 'AA' : 'FAIL',
  };
}

export interface AccessibilityElement {
  type: string;
  attributes: Record<string, string>;
  children: AccessibilityElement[];
  content?: string;
}

export interface AccessibilityValidationContext {
  issues: AccessibilityIssue[];
  recommendations: string[];
  score: number;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  score: number;
}

export interface ElementValidation {
  type: string;
  validate: (element: AccessibilityElement) => ValidationResult;
}

export interface ValidationFunction {
  (element: AccessibilityElement): ValidationResult;
}

export interface ValidationMap {
  [key: string]: ElementValidation;
}

const elementValidations: ValidationMap = {
  img: {
    type: 'image',
    validate: (element: AccessibilityElement): ValidationResult => ({
      valid: !!element.attributes.alt || element.attributes['aria-hidden'] === 'true',
      message: !element.attributes.alt ? 'Image missing alt text' : undefined,
      score: element.attributes.alt ? 100 : 0,
    }),
  },
  a: {
    type: 'link',
    validate: (element: AccessibilityElement): ValidationResult => ({
      valid: !!(element.content || element.attributes['aria-label']),
      message: !element.content ? 'Link has no content' : undefined,
      score: element.content ? 100 : 0,
    }),
  },
};

export function scoreAccessibility(element: AccessibilityElement): AccessibilityReport {
  const context: AccessibilityValidationContext = {
    issues: [],
    recommendations: [],
    score: 100,
  };

  // Validate element structure
  validateElement(element, context);

  // Generate recommendations
  generateRecommendations(context);

  return {
    score: context.score,
    issues: context.issues,
    recommendations: context.recommendations,
    wcagLevel: determineWCAGLevel(context.score),
  };
}

function validateElement(
  element: AccessibilityElement,
  context: AccessibilityValidationContext,
): void {
  // Validate current element
  validateElementAttributes(element, context);

  // Recursively validate children
  element.children.forEach((child) => validateElement(child, context));
}

function validateElementAttributes(
  element: AccessibilityElement,
  context: AccessibilityValidationContext,
): void {
  const { type } = element;

  // Use element validations if available
  const validation = elementValidations[type];
  if (validation) {
    const result = validation.validate(element);
    if (!result.valid && result.message) {
      context.issues.push({
        type: validation.type === 'image' ? 'missing-alt-text' : 'empty-link',
        severity: 'high',
        element: type,
        description: result.message,
        recommendation:
          validation.type === 'image'
            ? 'Add descriptive alt text or mark as decorative'
            : 'Add descriptive text or aria-label',
      });
      context.score -= (100 - result.score) * 0.1; // Deduct up to 10 points
    }
  }
}

function generateRecommendations(context: AccessibilityValidationContext): void {
  const { issues } = context;

  // Add general recommendations based on issues
  if (issues.some((i) => i.type === 'missing-alt-text')) {
    context.recommendations.push('Add alt text to all meaningful images');
  }
  if (issues.some((i) => i.type === 'empty-link')) {
    context.recommendations.push('Ensure all links have descriptive text');
  }
  if (issues.some((i) => i.severity === 'critical')) {
    context.recommendations.push('Address critical accessibility issues first');
  }
}

function determineWCAGLevel(score: number): 'A' | 'AA' | 'AAA' | 'FAIL' {
  if (score >= 95) return 'AAA';
  if (score >= 85) return 'AA';
  if (score >= 70) return 'A';
  return 'FAIL';
}
