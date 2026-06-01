import { Suspense } from "react";

import { PremiumHomepage } from "@/components/marketing/premium-homepage";
import { PricingStatusBanner } from "@/components/payments/PricingStatusBanner";

export default function PricingPage() {
  return (
    <>
      <Suspense fallback={null}>
        <PricingStatusBanner floating />
      </Suspense>
      <PremiumHomepage initialSection="pricing" />
    </>
  );
}
