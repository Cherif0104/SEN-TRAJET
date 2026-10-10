"use client";

import { useParams } from "next/navigation";
import { FoodOrderTracking } from "@/components/food/FoodOrderTracking";

export default function FoodOrderPage() {
  const params = useParams<{ id: string }>();
  return <FoodOrderTracking orderId={params.id} />;
}
