'use client';

import { Alert, AlertDescription } from '@/components/atoms/alert';
import { Card } from '@/components/atoms/card';
import { Label } from '@/components/atoms/label';
import { Switch } from '@/components/atoms/switch';
import type { UserSecurityPreferences } from '@/lib/integrations/clerk/security-utils';
import { useUser } from '@clerk/nextjs';
import { Bell, Clock, Loader2, Mail, MapPin, Shield, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface SecurityPreferencesFormProps {
  className?: string;
}

export function SecurityPreferencesForm({ className }: SecurityPreferencesFormProps) {
  const { user, isLoaded } = useUser();
  const [preferences, setPreferences] = useState<UserSecurityPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSavedPreferences, setLastSavedPreferences] = useState<UserSecurityPreferences | null>(
    null,
  );

  // Load current preferences
  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/security-preferences');
      const data = await response.json();

      if (data.success) {
        setPreferences(data.preferences);
        setLastSavedPreferences(data.preferences);
      } else {
        toast.error('Failed to load security preferences');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load security preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && user) {
      loadPreferences();
    }
  }, [isLoaded, user, loadPreferences]);

  const savePreferences = useCallback(async () => {
    if (!preferences || JSON.stringify(preferences) === JSON.stringify(lastSavedPreferences)) {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch('/api/user/security-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });

      const data = await response.json();

      if (data.success) {
        setLastSavedPreferences(preferences);
        toast.success('Security preferences saved');
      } else {
        toast.error(data.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }, [preferences, lastSavedPreferences]);

  const updatePreference = useCallback(
    (key: keyof UserSecurityPreferences, value: boolean) => {
      if (!preferences) return;
      setPreferences({ ...preferences, [key]: value });
    },
    [preferences],
  );

  // Auto-save when preferences change
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (preferences && JSON.stringify(preferences) !== JSON.stringify(lastSavedPreferences)) {
      saveTimeoutRef.current = setTimeout(() => {
        void savePreferences();
      }, 2000); // Auto-save after 2 seconds of no changes
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [preferences, lastSavedPreferences, savePreferences]);

  // Add protection against unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (preferences && JSON.stringify(preferences) !== JSON.stringify(lastSavedPreferences)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [preferences, lastSavedPreferences]);

  const hasUnsavedChanges =
    preferences && JSON.stringify(preferences) !== JSON.stringify(lastSavedPreferences);

  if (!isLoaded || loading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading security preferences...</span>
        </div>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className={className}>
        <div className="p-6">
          <Alert>
            <AlertDescription>Please sign in to manage your security preferences.</AlertDescription>
          </Alert>
        </div>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card className={className}>
        <div className="p-6">
          <Alert>
            <AlertDescription>
              Failed to load security preferences. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="p-6">
        <div className="mb-6 flex items-center">
          <Shield className="mr-3 h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold">Security Preferences</h2>
            <p className="mt-1 text-sm text-gray-600">
              Control when you receive security notifications and alerts
            </p>
          </div>
        </div>

        {/* Auto-save indicator */}
        {hasUnsavedChanges && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving preferences...</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <span>Unsaved changes</span>
              </>
            )}
          </div>
        )}

        <div className="space-y-6">
          {/* General Security Alerts */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">General Security</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-500" />
                <div>
                  <Label htmlFor="securityAlerts" className="text-sm font-medium">
                    Security Alerts
                  </Label>
                  <p className="text-xs text-gray-500">
                    Receive notifications for all security-related events
                  </p>
                </div>
              </div>
              <Switch
                id="securityAlerts"
                checked={preferences.securityAlerts}
                onCheckedChange={(checked) => updatePreference('securityAlerts', checked)}
              />
            </div>
          </div>

          {/* Specific Alert Types */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Specific Alerts</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-5 w-5 text-gray-500" />
                <div>
                  <Label htmlFor="newDeviceAlerts" className="text-sm font-medium">
                    New Device Alerts
                  </Label>
                  <p className="text-xs text-gray-500">
                    Get notified when you sign in from a new device or browser
                  </p>
                </div>
              </div>
              <Switch
                id="newDeviceAlerts"
                checked={preferences.newDeviceAlerts}
                onCheckedChange={(checked) => updatePreference('newDeviceAlerts', checked)}
                disabled={!preferences.securityAlerts}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-500" />
                <div>
                  <Label htmlFor="locationChangeAlerts" className="text-sm font-medium">
                    Location Change Alerts
                  </Label>
                  <p className="text-xs text-gray-500">
                    Get notified when you sign in from a new location
                  </p>
                </div>
              </div>
              <Switch
                id="locationChangeAlerts"
                checked={preferences.locationChangeAlerts}
                onCheckedChange={(checked) => updatePreference('locationChangeAlerts', checked)}
                disabled={!preferences.securityAlerts}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-gray-500" />
                <div>
                  <Label htmlFor="unusualTimingAlerts" className="text-sm font-medium">
                    Unusual Timing Alerts
                  </Label>
                  <p className="text-xs text-gray-500">
                    Get notified when you sign in at unusual times
                  </p>
                </div>
              </div>
              <Switch
                id="unusualTimingAlerts"
                checked={preferences.unusualTimingAlerts}
                onCheckedChange={(checked) => updatePreference('unusualTimingAlerts', checked)}
                disabled={!preferences.securityAlerts}
              />
            </div>
          </div>

          {/* Notification Methods */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notification Methods</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <div>
                  <Label htmlFor="emailNotifications" className="text-sm font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-xs text-gray-500">Receive security alerts via email</p>
                </div>
              </div>
              <Switch
                id="emailNotifications"
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
                disabled={!preferences.securityAlerts}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-gray-500" />
                <div>
                  <Label htmlFor="inAppNotifications" className="text-sm font-medium">
                    In-App Notifications
                  </Label>
                  <p className="text-xs text-gray-500">
                    Receive security alerts in the application
                  </p>
                </div>
              </div>
              <Switch
                id="inAppNotifications"
                checked={preferences.inAppNotifications}
                onCheckedChange={(checked) => updatePreference('inAppNotifications', checked)}
                disabled={!preferences.securityAlerts}
              />
            </div>
          </div>

          {/* Auto-save info */}
          <div className="border-t pt-4">
            <p className="text-center text-xs text-muted-foreground">
              Changes are automatically saved
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
