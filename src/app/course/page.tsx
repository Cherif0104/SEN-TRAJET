import { InstantRidePage } from "@/app/taxi-aeroport/page";
import type { SelectedPlace } from "@/components/booking/AddressAutocomplete";
import type { RideClass } from "@/lib/liveRidePricing";

export default function CoursePage({
  searchParams,
}: {
  searchParams: { dropoff?: string; dropoffLat?: string; dropoffLng?: string; class?: string };
}) {
  const lat = Number(searchParams.dropoffLat);
  const lng = Number(searchParams.dropoffLng);
  const defaultDestination: SelectedPlace | null =
    searchParams.dropoff && Number.isFinite(lat) && Number.isFinite(lng)
      ? {
          id: `home:${lat},${lng}`,
          label: searchParams.dropoff,
          address: searchParams.dropoff,
          lat,
          lng,
          source: "home_search",
        }
      : null;
  const defaultRideClass: RideClass =
    searchParams.class === "comfort_plus" || searchParams.class === "vip"
      ? searchParams.class
      : "comfort";

  return (
    <InstantRidePage
      defaultDestination={defaultDestination}
      defaultRideClass={defaultRideClass}
      rideKind="city"
      eyebrow="Course en direct"
      title="Où allez-vous ?"
    />
  );
}
