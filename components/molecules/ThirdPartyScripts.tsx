import Script from 'next/script';

export function ThirdPartyScripts() {
  return (
    <>
      <Script
        id="Cookiebot"
        src="https://consent.cookiebot.com/uc.js"
        data-cbid="1573b39a-8ce3-4069-a21b-fd9e653c0357"
        data-blockingmode="auto"
        strategy="afterInteractive"
      />
      {/* Add other third-party scripts here */}
    </>
  );
}
