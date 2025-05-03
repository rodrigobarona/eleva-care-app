'use client';

import React from 'react';

export default function MDXContentWrapper({ locale }: { locale: string }) {
  const [Content, setContent] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    const loadContent = async () => {
      try {
        const contentModule = await import(`./content/about_${locale}.mdx`);
        setContent(() => contentModule.default);
      } catch (e) {
        console.log(`MDX file for locale ${locale} not found, falling back to English ${e}`);
        const enModule = await import('./content/about_en.mdx');
        setContent(() => enModule.default);
      }
    };

    loadContent();
  }, [locale]);

  if (!Content) {
    return <p className="p-8">Loading content...</p>;
  }

  return <Content />;
}
