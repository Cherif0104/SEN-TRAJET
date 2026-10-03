import { InstantRidePage } from "@/app/taxi-aeroport/page";
import type { SelectedPlace } from "@/components/booking/AddressAutocomplete";

export default function CoursePage({
  searchParams,
}: {
  searchParams: { dropoff?: string; dropoffLat?: string; dropoffLng?: string };
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

  return (
    <InstantRidePage
      defaultDestination={defaultDestination}
      rideKind="city"
      eyebrow="Course en direct"
      title="Où allez-vous ?"
    />
  );
}
