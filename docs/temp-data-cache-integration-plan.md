# Temp Data Cache Integration Plan - Eleva Care

## 🎯 **Overview: Secure Temporary Data Management**

Transform Eleva Care's multi-step processes with Redis-powered temporary data caching, secure state management, and optimized user experience flows. This plan focuses on integrating the **TempDataCache** to handle complex workflows, form progress, and temporary data storage.

## 📊 **Current State Analysis**

### **Existing Temporary Data Patterns**

- ✅ **Form Submissions**: Basic form handling without progress persistence
- ✅ **OAuth Flows**: State management for authentication
- ✅ **File Uploads**: Temporary file handling during processing
- ✅ **Verification Processes**: Multi-step identity verification
- ✅ **Onboarding Flows**: User and expert registration processes

### **Current Limitations**

- **No Progress Persistence**: Users lose progress on page refresh
- **State Management**: Limited temporary state storage
- **Security Gaps**: Sensitive temporary data not properly secured
- **Poor UX**: No recovery from interrupted workflows
- **Memory Inefficiency**: Temporary data stored in browser only

## 🚀 **TempDataCache Integration Strategy**

### **Phase 1: Core Temporary Data Management (Week 1)**

#### **1.1 Multi-step Form Progress** - `components/forms/form-progress-manager.tsx`

**Time Estimate**: 6 hours

```typescript
// Multi-step form with persistent progress
import { TempDataCache } from '@/lib/redis';

export class FormProgressManager {
  async saveFormProgress(
    userId: string,
    formId: string,
    step: number,
    data: any,
    expiresIn: number = 3600,
  ): Promise<void> {
    const progressKey = `form_progress:${userId}:${formId}`;

    const progressData = {
      currentStep: step,
      formData: data,
      lastUpdated: Date.now(),
      totalSteps: this.getTotalSteps(formId),
      completedSteps: this.getCompletedSteps(data),
    };

    // Store with automatic expiration
    await TempDataCache.storeTemporaryData(progressKey, progressData, expiresIn);

    // Track progress for analytics
    await this.trackFormProgress(userId, formId, step);
  }

  async getFormProgress(userId: string, formId: string): Promise<FormProgress | null> {
    const progressKey = `form_progress:${userId}:${formId}`;

    const progress = await TempDataCache.getTemporaryData(progressKey);

    if (!progress) {
      return null;
    }

    // Check if progress is still valid
    const isValid = await this.validateFormProgress(progress);

    if (!isValid) {
      await this.clearFormProgress(userId, formId);
      return null;
    }

    return progress;
  }

  async resumeForm(userId: string, formId: string): Promise<FormResumeData> {
    const progress = await this.getFormProgress(userId, formId);

    if (!progress) {
      return {
        canResume: false,
        startFromStep: 1,
        message: 'No saved progress found',
      };
    }

    // Validate that user can resume from this step
    const canResume = await this.canResumeFromStep(userId, formId, progress.currentStep);

    return {
      canResume,
      startFromStep: canResume ? progress.currentStep : 1,
      savedData: canResume ? progress.formData : null,
      lastUpdated: progress.lastUpdated,
      message: canResume
        ? `Resume from step ${progress.currentStep} of ${progress.totalSteps}`
        : 'Starting fresh due to expired session',
    };
  }

  async completeForm(userId: string, formId: string, finalData: any): Promise<void> {
    // Process final form submission
    await this.processFinalSubmission(userId, formId, finalData);

    // Clear temporary progress data
    await this.clearFormProgress(userId, formId);

    // Track completion
    await this.trackFormCompletion(userId, formId);
  }

  private async validateFormProgress(progress: FormProgress): boolean {
    // Check if progress data is still valid
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const age = Date.now() - progress.lastUpdated;

    return age < maxAge && progress.formData && progress.currentStep > 0;
  }
}
```

**Benefits**:

- **Persistent progress** across browser sessions
- **Automatic expiration** for security
- **Resume capability** improving user experience

#### **1.2 OAuth State Management** - `lib/oauth/state-manager.ts`

**Time Estimate**: 4 hours

```typescript
// Secure OAuth state management with Redis
export class OAuthStateManager {
  async createOAuthState(
    userId: string,
    provider: string,
    redirectUrl: string,
    additionalData?: any,
  ): Promise<string> {
    // Generate secure state token
    const stateToken = this.generateSecureToken();

    const stateData = {
      userId,
      provider,
      redirectUrl,
      additionalData,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    // Store state with short expiration for security
    await TempDataCache.storeTemporaryData(
      `oauth_state:${stateToken}`,
      stateData,
      600, // 10 minutes
    );

    return stateToken;
  }

  async validateOAuthState(stateToken: string): Promise<OAuthStateData | null> {
    const stateKey = `oauth_state:${stateToken}`;

    const stateData = await TempDataCache.getTemporaryData(stateKey);

    if (!stateData) {
      throw new Error('Invalid or expired OAuth state');
    }

    // Verify expiration
    if (Date.now() > stateData.expiresAt) {
      await TempDataCache.removeTemporaryData(stateKey);
      throw new Error('OAuth state has expired');
    }

    return stateData;
  }

  async consumeOAuthState(stateToken: string): Promise<OAuthStateData> {
    // Validate and get state data
    const stateData = await this.validateOAuthState(stateToken);

    if (!stateData) {
      throw new Error('Invalid OAuth state');
    }

    // Remove state after consumption (one-time use)
    await TempDataCache.removeTemporaryData(`oauth_state:${stateToken}`);

    return stateData;
  }

  async cleanupExpiredStates(): Promise<void> {
    // Cleanup expired OAuth states
    const pattern = 'oauth_state:*';
    const expiredStates = await TempDataCache.findExpiredData(pattern);

    if (expiredStates.length > 0) {
      await TempDataCache.removeMultipleTemporaryData(expiredStates);
    }
  }

  private generateSecureToken(): string {
    // Generate cryptographically secure random token
    return crypto.randomBytes(32).toString('hex');
  }
}
```

#### **1.3 Verification Token Storage** - `lib/verification/token-manager.ts`

**Time Estimate**: 4 hours

```typescript
// Secure verification token management
export class VerificationTokenManager {
  async createVerificationToken(
    userId: string,
    type: VerificationType,
    data: any,
    expiresInMinutes: number = 30,
  ): Promise<string> {
    const token = this.generateVerificationToken();

    const tokenData = {
      userId,
      type,
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + expiresInMinutes * 60 * 1000,
      attempts: 0,
      maxAttempts: this.getMaxAttemptsForType(type),
    };

    const tokenKey = `verification_token:${type}:${token}`;

    // Store with expiration
    await TempDataCache.storeTemporaryData(tokenKey, tokenData, expiresInMinutes * 60);

    // Track token creation
    await this.trackTokenCreation(userId, type);

    return token;
  }

  async validateVerificationToken(
    token: string,
    type: VerificationType,
    providedData?: any,
  ): Promise<VerificationResult> {
    const tokenKey = `verification_token:${type}:${token}`;

    const tokenData = await TempDataCache.getTemporaryData(tokenKey);

    if (!tokenData) {
      return {
        valid: false,
        reason: 'Token not found or expired',
        canRetry: false,
      };
    }

    // Check expiration
    if (Date.now() > tokenData.expiresAt) {
      await TempDataCache.removeTemporaryData(tokenKey);
      return {
        valid: false,
        reason: 'Token has expired',
        canRetry: true,
      };
    }

    // Check attempt limits
    if (tokenData.attempts >= tokenData.maxAttempts) {
      await TempDataCache.removeTemporaryData(tokenKey);
      return {
        valid: false,
        reason: 'Maximum attempts exceeded',
        canRetry: false,
      };
    }

    // Validate provided data if required
    if (providedData && !this.validateTokenData(tokenData.data, providedData)) {
      // Increment attempt counter
      tokenData.attempts++;
      await TempDataCache.storeTemporaryData(
        tokenKey,
        tokenData,
        Math.floor((tokenData.expiresAt - Date.now()) / 1000),
      );

      return {
        valid: false,
        reason: 'Invalid verification data',
        canRetry: tokenData.attempts < tokenData.maxAttempts,
        attemptsRemaining: tokenData.maxAttempts - tokenData.attempts,
      };
    }

    return {
      valid: true,
      userId: tokenData.userId,
      data: tokenData.data,
    };
  }

  async consumeVerificationToken(token: string, type: VerificationType): Promise<VerificationData> {
    const result = await this.validateVerificationToken(token, type);

    if (!result.valid) {
      throw new Error(result.reason);
    }

    // Remove token after successful consumption
    const tokenKey = `verification_token:${type}:${token}`;
    await TempDataCache.removeTemporaryData(tokenKey);

    // Track successful verification
    await this.trackTokenConsumption(result.userId!, type);

    return result.data;
  }

  private getMaxAttemptsForType(type: VerificationType): number {
    const attemptLimits = {
      email_verification: 3,
      phone_verification: 5,
      identity_verification: 3,
      password_reset: 3,
      two_factor: 3,
    };

    return attemptLimits[type] || 3;
  }
}
```

### **Phase 2: Advanced Workflow Management (Week 2)**

#### **2.1 Onboarding Progress Tracking** - `app/onboarding/progress-tracker.ts`

**Time Estimate**: 5 hours

```typescript
// Comprehensive onboarding progress management
export class OnboardingProgressTracker {
  async initializeOnboarding(
    userId: string,
    userType: 'user' | 'expert',
  ): Promise<OnboardingSession> {
    const sessionId = this.generateSessionId();

    const onboardingData = {
      sessionId,
      userId,
      userType,
      currentStep: 1,
      totalSteps: this.getTotalStepsForType(userType),
      completedSteps: [],
      stepData: {},
      startedAt: Date.now(),
      lastActivity: Date.now(),
      estimatedCompletion: this.estimateCompletionTime(userType),
    };

    const sessionKey = `onboarding:${userId}:${sessionId}`;

    // Store for 7 days (long onboarding process)
    await TempDataCache.storeTemporaryData(sessionKey, onboardingData, 7 * 24 * 3600);

    // Track onboarding start
    await this.trackOnboardingStart(userId, userType);

    return onboardingData;
  }

  async updateOnboardingStep(
    userId: string,
    sessionId: string,
    step: number,
    stepData: any,
    isCompleted: boolean = false,
  ): Promise<OnboardingProgress> {
    const sessionKey = `onboarding:${userId}:${sessionId}`;

    const onboardingData = await TempDataCache.getTemporaryData(sessionKey);

    if (!onboardingData) {
      throw new Error('Onboarding session not found');
    }

    // Update step data
    onboardingData.stepData[step] = stepData;
    onboardingData.lastActivity = Date.now();

    if (isCompleted && !onboardingData.completedSteps.includes(step)) {
      onboardingData.completedSteps.push(step);
    }

    // Calculate next step
    const nextStep = this.calculateNextStep(onboardingData);
    onboardingData.currentStep = nextStep;

    // Update progress percentage
    const progressPercentage =
      (onboardingData.completedSteps.length / onboardingData.totalSteps) * 100;

    // Store updated data
    await TempDataCache.storeTemporaryData(sessionKey, onboardingData, 7 * 24 * 3600);

    // Track step completion
    await this.trackStepCompletion(userId, step, progressPercentage);

    return {
      currentStep: nextStep,
      completedSteps: onboardingData.completedSteps,
      progressPercentage,
      isComplete: onboardingData.completedSteps.length === onboardingData.totalSteps,
      estimatedTimeRemaining: this.estimateTimeRemaining(onboardingData),
    };
  }

  async getOnboardingStatus(userId: string): Promise<OnboardingStatus | null> {
    // Find active onboarding session
    const pattern = `onboarding:${userId}:*`;
    const sessions = await TempDataCache.findDataByPattern(pattern);

    if (sessions.length === 0) {
      return null;
    }

    // Get the most recent session
    const latestSession = sessions.reduce((latest, current) =>
      current.lastActivity > latest.lastActivity ? current : latest,
    );

    return {
      sessionId: latestSession.sessionId,
      currentStep: latestSession.currentStep,
      totalSteps: latestSession.totalSteps,
      completedSteps: latestSession.completedSteps,
      progressPercentage: (latestSession.completedSteps.length / latestSession.totalSteps) * 100,
      canResume: Date.now() - latestSession.lastActivity < 24 * 60 * 60 * 1000, // 24 hours
      lastActivity: latestSession.lastActivity,
    };
  }

  async completeOnboarding(userId: string, sessionId: string): Promise<void> {
    const sessionKey = `onboarding:${userId}:${sessionId}`;
    const onboardingData = await TempDataCache.getTemporaryData(sessionKey);

    if (!onboardingData) {
      throw new Error('Onboarding session not found');
    }

    // Process final onboarding data
    await this.processFinalOnboardingData(userId, onboardingData);

    // Clear temporary onboarding data
    await TempDataCache.removeTemporaryData(sessionKey);

    // Track completion
    await this.trackOnboardingCompletion(userId, onboardingData.userType);
  }

  private calculateNextStep(onboardingData: OnboardingSession): number {
    // Logic to determine next step based on completed steps and user type
    const allSteps = Array.from({ length: onboardingData.totalSteps }, (_, i) => i + 1);
    const nextIncompleteStep = allSteps.find(
      (step) => !onboardingData.completedSteps.includes(step),
    );

    return nextIncompleteStep || onboardingData.totalSteps;
  }
}
```

#### **2.2 File Upload Session Management** - `lib/uploads/session-manager.ts`

**Time Estimate**: 4 hours

```typescript
// File upload session management with progress tracking
export class FileUploadSessionManager {
  async createUploadSession(
    userId: string,
    fileInfo: FileInfo,
    uploadType: string,
  ): Promise<UploadSession> {
    const sessionId = this.generateUploadSessionId();

    const sessionData = {
      sessionId,
      userId,
      fileInfo,
      uploadType,
      status: 'initialized',
      progress: 0,
      chunks: [],
      totalChunks: Math.ceil(fileInfo.size / this.getChunkSize()),
      createdAt: Date.now(),
      expiresAt: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
    };

    const sessionKey = `upload_session:${sessionId}`;

    // Store with 2-hour expiration
    await TempDataCache.storeTemporaryData(sessionKey, sessionData, 2 * 3600);

    return sessionData;
  }

  async updateUploadProgress(
    sessionId: string,
    chunkIndex: number,
    chunkData: string,
  ): Promise<UploadProgress> {
    const sessionKey = `upload_session:${sessionId}`;

    const sessionData = await TempDataCache.getTemporaryData(sessionKey);

    if (!sessionData) {
      throw new Error('Upload session not found or expired');
    }

    // Store chunk data
    sessionData.chunks[chunkIndex] = chunkData;

    // Update progress
    const completedChunks = sessionData.chunks.filter(Boolean).length;
    sessionData.progress = (completedChunks / sessionData.totalChunks) * 100;

    // Update status
    if (completedChunks === sessionData.totalChunks) {
      sessionData.status = 'completed';
    } else {
      sessionData.status = 'uploading';
    }

    // Store updated session
    await TempDataCache.storeTemporaryData(sessionKey, sessionData, 2 * 3600);

    return {
      sessionId,
      progress: sessionData.progress,
      status: sessionData.status,
      completedChunks,
      totalChunks: sessionData.totalChunks,
    };
  }

  async finalizeUpload(sessionId: string): Promise<FinalizedUpload> {
    const sessionKey = `upload_session:${sessionId}`;

    const sessionData = await TempDataCache.getTemporaryData(sessionKey);

    if (!sessionData || sessionData.status !== 'completed') {
      throw new Error('Upload session not ready for finalization');
    }

    // Reconstruct file from chunks
    const fileData = sessionData.chunks.join('');

    // Process and store file
    const finalFile = await this.processUploadedFile(
      sessionData.userId,
      sessionData.fileInfo,
      fileData,
      sessionData.uploadType,
    );

    // Clean up temporary session data
    await TempDataCache.removeTemporaryData(sessionKey);

    return finalFile;
  }

  async resumeUpload(sessionId: string): Promise<UploadResumeInfo> {
    const sessionKey = `upload_session:${sessionId}`;

    const sessionData = await TempDataCache.getTemporaryData(sessionKey);

    if (!sessionData) {
      return {
        canResume: false,
        reason: 'Session not found or expired',
      };
    }

    const completedChunks = sessionData.chunks.filter(Boolean).length;

    return {
      canResume: true,
      sessionId,
      progress: sessionData.progress,
      completedChunks,
      totalChunks: sessionData.totalChunks,
      nextChunkIndex: completedChunks,
    };
  }
}
```

### **Phase 3: Wizard and Complex Flow Management (Week 2)**

#### **3.1 Wizard Completion States** - `components/wizards/wizard-state-manager.tsx`

**Time Estimate**: 4 hours

```typescript
// Complex wizard state management
export class WizardStateManager {
  async initializeWizard(
    userId: string,
    wizardType: string,
    initialData?: any,
  ): Promise<WizardSession> {
    const wizardId = this.generateWizardId();

    const wizardConfig = this.getWizardConfig(wizardType);

    const wizardData = {
      wizardId,
      userId,
      wizardType,
      currentStep: 1,
      steps: wizardConfig.steps,
      stepData: initialData || {},
      validationResults: {},
      canProceed: {},
      startedAt: Date.now(),
      lastActivity: Date.now(),
    };

    const wizardKey = `wizard:${wizardType}:${userId}:${wizardId}`;

    // Store for 24 hours
    await TempDataCache.storeTemporaryData(wizardKey, wizardData, 24 * 3600);

    return wizardData;
  }

  async updateWizardStep(
    userId: string,
    wizardId: string,
    wizardType: string,
    stepData: any,
    validationResults?: ValidationResult[],
  ): Promise<WizardStepResult> {
    const wizardKey = `wizard:${wizardType}:${userId}:${wizardId}`;

    const wizardData = await TempDataCache.getTemporaryData(wizardKey);

    if (!wizardData) {
      throw new Error('Wizard session not found');
    }

    // Update step data
    Object.assign(wizardData.stepData, stepData);
    wizardData.lastActivity = Date.now();

    // Store validation results
    if (validationResults) {
      wizardData.validationResults[wizardData.currentStep] = validationResults;
    }

    // Check if current step is valid
    const isStepValid = await this.validateWizardStep(
      wizardType,
      wizardData.currentStep,
      wizardData.stepData,
    );

    wizardData.canProceed[wizardData.currentStep] = isStepValid;

    // Store updated wizard data
    await TempDataCache.storeTemporaryData(wizardKey, wizardData, 24 * 3600);

    return {
      currentStep: wizardData.currentStep,
      isValid: isStepValid,
      canProceed: isStepValid,
      validationErrors: validationResults?.filter((r) => !r.valid) || [],
      nextStep: isStepValid ? wizardData.currentStep + 1 : wizardData.currentStep,
    };
  }

  async navigateWizard(
    userId: string,
    wizardId: string,
    wizardType: string,
    direction: 'next' | 'previous' | number,
  ): Promise<WizardNavigationResult> {
    const wizardKey = `wizard:${wizardType}:${userId}:${wizardId}`;

    const wizardData = await TempDataCache.getTemporaryData(wizardKey);

    if (!wizardData) {
      throw new Error('Wizard session not found');
    }

    let newStep: number;

    if (typeof direction === 'number') {
      newStep = direction;
    } else if (direction === 'next') {
      newStep = wizardData.currentStep + 1;
    } else {
      newStep = wizardData.currentStep - 1;
    }

    // Validate navigation
    const canNavigate = await this.canNavigateToStep(wizardData, newStep);

    if (!canNavigate.allowed) {
      return {
        success: false,
        currentStep: wizardData.currentStep,
        reason: canNavigate.reason,
      };
    }

    // Update current step
    wizardData.currentStep = newStep;
    wizardData.lastActivity = Date.now();

    // Store updated wizard data
    await TempDataCache.storeTemporaryData(wizardKey, wizardData, 24 * 3600);

    return {
      success: true,
      currentStep: newStep,
      stepData: this.getStepData(wizardData, newStep),
      isLastStep: newStep === wizardData.steps.length,
      canGoBack: newStep > 1,
      canGoForward: wizardData.canProceed[newStep] === true,
    };
  }

  async completeWizard(
    userId: string,
    wizardId: string,
    wizardType: string,
  ): Promise<WizardCompletionResult> {
    const wizardKey = `wizard:${wizardType}:${userId}:${wizardId}`;

    const wizardData = await TempDataCache.getTemporaryData(wizardKey);

    if (!wizardData) {
      throw new Error('Wizard session not found');
    }

    // Validate all steps are completed
    const allStepsValid = await this.validateAllWizardSteps(wizardData);

    if (!allStepsValid.valid) {
      return {
        success: false,
        errors: allStepsValid.errors,
        incompleteSteps: allStepsValid.incompleteSteps,
      };
    }

    // Process wizard completion
    const result = await this.processWizardCompletion(wizardType, wizardData.stepData);

    // Clean up wizard data
    await TempDataCache.removeTemporaryData(wizardKey);

    return {
      success: true,
      result,
      completedAt: Date.now(),
    };
  }
}
```

## 📈 **Expected Performance Improvements**

### **Immediate Benefits (Phase 1)**

- **90% reduction** in form abandonment due to progress loss
- **Secure state management** for OAuth and verification flows
- **Improved user experience** with persistent progress
- **Enhanced security** with proper token management

### **Advanced Benefits (Phase 2-3)**

- **Seamless onboarding** with progress tracking
- **Reliable file uploads** with resume capability
- **Complex workflow management** with state persistence
- **Better conversion rates** through improved UX

## 🔧 **Implementation Checklist**

### **Week 1: Core Temporary Data Management**

- [ ] Implement multi-step form progress management
- [ ] Add secure OAuth state management
- [ ] Create verification token storage system
- [ ] Add basic temporary data cleanup
- [ ] Implement progress tracking analytics

### **Week 2: Advanced Workflow Management**

- [ ] Create onboarding progress tracking system
- [ ] Implement file upload session management
- [ ] Add wizard completion state management
- [ ] Create workflow analytics and monitoring
- [ ] Add automated cleanup processes

### **Week 3: Testing & Optimization**

- [ ] Load testing with complex workflows
- [ ] Security testing for token management
- [ ] User experience testing for progress persistence
- [ ] Documentation and best practices guide

## 🎯 **Success Metrics**

### **User Experience KPIs**

- **Form Completion Rate**: 40% improvement in multi-step forms
- **Onboarding Completion**: 60% improvement in completion rates
- **User Satisfaction**: Improved ratings for complex workflows
- **Support Tickets**: 50% reduction in progress-related issues

### **Technical KPIs**

- **Data Security**: 100% secure token management
- **Cache Hit Rate**: >90% for temporary data retrieval
- **Cleanup Efficiency**: Automatic cleanup of expired data
- **Error Rate**: <0.1% temporary data related errors

## 🔄 **Integration with Existing Systems**

### **Form System Compatibility**

- Seamless integration with existing form components
- Enhanced progress tracking without breaking changes
- Backward compatible with simple forms

### **Authentication Flow Integration**

- Enhanced OAuth flows with secure state management
- Improved verification processes with token management
- Better security with temporary data encryption

## 🚀 **Next Steps**

1. **Implement Phase 1** core temporary data management
2. **Test with existing forms** to ensure compatibility
3. **Monitor user experience improvements** and completion rates
4. **Implement Phase 2 advanced features** based on usage patterns
5. **Document temporary data patterns** for future development

**Transforming Eleva Care into a seamless workflow powerhouse with intelligent temporary data management! ⏳⚡**
