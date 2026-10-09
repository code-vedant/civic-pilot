export default function PrivacyBanner() {
  return (
    <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-2.5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-[10px]">✓</span>
        <p className="text-[9px] leading-4 text-neutral-500">
          Field values are not sent to CivicPilot telemetry. Never share passwords, OTPs or CAPTCHA codes.
        </p>
      </div>
    </div>
  );
}
