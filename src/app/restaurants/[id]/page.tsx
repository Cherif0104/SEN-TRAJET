"use client";

import { useParams } from "next/navigation";
import { FoodRestaurantDetail } from "@/components/food/FoodRestaurantDetail";

export default function RestaurantDetailPage() {
  const params = useParams<{ id: string }>();
  return <FoodRestaurantDetail restaurantId={params.id} />;
}
