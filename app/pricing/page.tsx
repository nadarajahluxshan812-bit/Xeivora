import { Suspense } from "react";

import { PricingMarketingPage } from "@/components/marketing/marketing-pages";
import { PricingStatusBanner } from "@/components/payments/PricingStatusBanner";

export default function PricingPage() {
  return (
    <>
      <Suspense fallback={null}>
        <PricingStatusBanner />
      </Suspense>
      <PricingMarketingPage />
    </>
  );
}
