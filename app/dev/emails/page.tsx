'use client';

import { render } from '@react-email/render';
import { useEffect, useState } from 'react';

import { WelcomeEmail } from '../../../lib/email-templates/templates/WelcomeEmail';

interface EmailTemplate {
  name: string;
  component: React.ComponentType<Record<string, unknown>>;
  props: Record<string, unknown>;
}

const emailTemplates: EmailTemplate[] = [
  {
    name: 'Welcome Email',
    component: WelcomeEmail,
    props: {
      userName: 'Dr. Sarah Johnson',
      dashboardUrl: '/dashboard',
      nextSteps: [
        {
          title: 'Complete your health profile',
          description: 'Help us personalize your care experience',
          actionUrl: '/profile/complete',
          actionText: 'Complete Profile',
        },
        {
          title: 'Browse expert providers',
          description: 'Find healthcare professionals that match your needs',
          actionUrl: '/providers',
          actionText: 'View Providers',
        },
        {
          title: 'Schedule your first consultation',
          description: 'Book a convenient time with your preferred provider',
          actionUrl: '/book',
          actionText: 'Schedule Now',
        },
      ],
      customization: {
        socialLinks: [
          { platform: 'twitter', url: 'https://twitter.com/elevacare', label: 'Twitter' },
          {
            platform: 'linkedin',
            url: 'https://linkedin.com/company/elevacare',
            label: 'LinkedIn',
          },
        ],
      },
      language: 'en',
      theme: 'light',
    },
  },
];

export default function EmailDevPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(emailTemplates[0]);
  const [htmlOutput, setHtmlOutput] = useState<string>('');
  const [textOutput, setTextOutput] = useState<string>('');
  const [viewMode, setViewMode] = useState<'preview' | 'html' | 'text'>('preview');
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  useEffect(() => {
    const generateOutputs = async () => {
      try {
        const Component = selectedTemplate.component;
        const html = await render(<Component {...selectedTemplate.props} />);
        const text = await render(<Component {...selectedTemplate.props} />, {
          plainText: true,
        });

        setHtmlOutput(html);
        setTextOutput(text);
      } catch (error) {
        console.error('Error rendering email:', error);
        setHtmlOutput('Error rendering email template');
        setTextOutput('Error rendering email template');
      }
    };

    generateOutputs();
  }, [selectedTemplate]);

  const downloadHTML = () => {
    const blob = new Blob([htmlOutput], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.name.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      setSendResult('Please enter an email address');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const response = await fetch('/api/dev/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
          template: 'welcome',
          ...selectedTemplate.props,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSendResult(`✅ ${result.message}`);
      } else {
        setSendResult(`❌ ${result.error}`);
      }
    } catch (error) {
      setSendResult('❌ Failed to send email');
      console.error('Error sending test email:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Check if we're in production AFTER all hooks have been called
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Page Not Available</h1>
          <p className="text-gray-600">Email development tools are not available in production.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-gray-900">Email Template Development</h1>
          <p className="mt-1 text-gray-600">Preview and test email templates locally</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-4 shadow">
              <h2 className="mb-4 font-semibold text-gray-900">Templates</h2>
              <div className="space-y-2">
                {emailTemplates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedTemplate.name === template.name
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>

              <div className="mt-6 border-t border-gray-200 pt-4">
                <h3 className="mb-3 font-medium text-gray-900">View Mode</h3>
                <div className="space-y-2">
                  {(['preview', 'html', 'text'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm capitalize transition-colors ${
                        viewMode === mode
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-4">
                <h3 className="mb-3 font-medium text-gray-900">Test Email</h3>
                <div className="space-y-3">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your-email@example.com"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendTestEmail}
                    disabled={isSending || !testEmail}
                    className="w-full rounded-md bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {isSending ? 'Sending...' : 'Send Test Email'}
                  </button>
                  {sendResult && (
                    <div className="rounded-md bg-gray-100 p-2 text-xs text-gray-700">
                      {sendResult}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-4">
                <button
                  onClick={downloadHTML}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                >
                  Download HTML
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="font-semibold text-gray-900">{selectedTemplate.name}</h2>
              </div>

              <div className="p-6">
                {viewMode === 'preview' && (
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <iframe
                      srcDoc={htmlOutput}
                      className="h-[800px] w-full"
                      title="Email Preview"
                    />
                  </div>
                )}

                {viewMode === 'html' && (
                  <div className="max-h-[800px] overflow-auto rounded-lg bg-gray-900 p-4 text-gray-100">
                    <pre className="text-sm">
                      <code>{htmlOutput}</code>
                    </pre>
                  </div>
                )}

                {viewMode === 'text' && (
                  <div className="max-h-[800px] overflow-auto rounded-lg bg-gray-100 p-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">{textOutput}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
