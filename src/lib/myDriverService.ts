import { supabase } from "@/lib/supabase";

export type MyDriverProfile = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  city: string;
  photo_url: string | null;
  cv_url: string | null;
  id_document_url: string | null;
  license_document_url: string | null;
  license_number: string;
  license_categories: string[];
  years_experience: number;
  languages: string[];
  vehicle_skills: string[];
  transmission_skills: string[];
  bio: string | null;
  hourly_rate_fcfa: number;
  daily_rate_fcfa: number;
  status: "en_attente" | "verifie" | "suspendu" | "rejete";
  is_available: boolean;
  average_rating: number;
  completed_jobs: number;
  rejection_reason: string | null;
  created_at: string;
};

export type MyDriverSubscription = {
  id: string;
  driver_profile_id: string;
  plan: "essai_gratuit" | "hebdomadaire";
  amount_fcfa: number;
  starts_at: string;
  ends_at: string;
  status: "pending" | "actif" | "expire" | "suspendu";
};

export type MyDriverRequest = {
  id: string;
  reference: string;
  client_user_id: string;
  client_name: string;
  client_phone: string;
  pickup_address: string;
  starts_at: string;
  duration_hours: number;
  mission_type: string;
  vehicle_type: string;
  transmission: string;
  required_language: string | null;
  notes: string | null;
  max_budget_fcfa: number | null;
  driver_payout_fcfa: number | null;
  platform_fee_fcfa: number | null;
  amount_fcfa: number | null;
  assigned_driver_profile_id: string | null;
  status: string;
  payment_status: string;
  search_expires_at: string;
  assigned_driver?: Pick<
    MyDriverProfile,
    | "id"
    | "full_name"
    | "city"
    | "photo_url"
    | "languages"
    | "years_experience"
    | "average_rating"
    | "completed_jobs"
  > | null;
};

export type MyDriverAssignment = {
  id: string;
  request_id: string;
  driver_profile_id: string;
  status: string;
  expires_at: string;
  request?: MyDriverRequest;
};

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Connectez-vous pour continuer.");
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Le service Mon Chauffeur est indisponible.");
  return payload;
}

export async function getMyDriverProfile(): Promise<{
  profile: MyDriverProfile | null;
  subscriptions: MyDriverSubscription[];
}> {
  return authFetch("/api/my-driver/profiles");
}

export async function registerMyDriverProfile(input: {
  fullName: string;
  phone: string;
  city: string;
  licenseNumber: string;
  licenseCategories: string[];
  yearsExperience: number;
  languages: string[];
  vehicleSkills: string[];
  transmissionSkills: string[];
  bio?: string;
  hourlyRateFcfa: number;
  dailyRateFcfa: number;
  cvUrl?: string;
  licenseDocumentUrl?: string;
  idDocumentUrl?: string;
  photoUrl?: string;
}): Promise<MyDriverProfile> {
  const payload = await authFetch<{ profile: MyDriverProfile }>("/api/my-driver/profiles", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.profile;
}

export async function uploadMyDriverDocument(
  kind: "cv" | "permis" | "identite" | "photo",
  file: File,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Connectez-vous pour envoyer un document.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${user.id}/${kind}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from("my-driver-documents")
    .upload(path, file, { upsert: false });
  if (error) throw new Error("Le document n’a pas pu être envoyé.");
  return path;
}

export async function getMyDriverDocumentSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("my-driver-documents")
    .createSignedUrl(path, 900);
  if (error || !data.signedUrl) throw new Error("Document indisponible.");
  return data.signedUrl;
}

export async function setMyDriverAvailability(isAvailable: boolean): Promise<MyDriverProfile> {
  const payload = await authFetch<{ profile: MyDriverProfile }>("/api/my-driver/profiles", {
    method: "PATCH",
    body: JSON.stringify({ isAvailable }),
  });
  return payload.profile;
}

export async function createMyDriverRequest(input: {
  clientName: string;
  clientPhone: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  startsAt: string;
  durationHours: number;
  missionType: string;
  vehicleType: string;
  transmission: string;
  requiredLanguage?: string;
  notes?: string;
  maxBudgetFcfa?: number | null;
}): Promise<MyDriverRequest> {
  const payload = await authFetch<{ request: MyDriverRequest }>("/api/my-driver/missions", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.request;
}

export async function getMyDriverRequest(requestId: string): Promise<MyDriverRequest> {
  const payload = await authFetch<{ request: MyDriverRequest }>(
    `/api/my-driver/missions?requestId=${encodeURIComponent(requestId)}`,
  );
  return payload.request;
}

export async function listMyDriverAssignments(): Promise<MyDriverAssignment[]> {
  const payload = await authFetch<{ assignments: MyDriverAssignment[] }>(
    "/api/my-driver/assignments",
  );
  return payload.assignments;
}

export async function respondMyDriverAssignment(
  assignmentId: string,
  accept: boolean,
): Promise<void> {
  await authFetch("/api/my-driver/assignments", {
    method: "PATCH",
    body: JSON.stringify({ assignmentId, accept }),
  });
}

export async function startMyDriverPayment(
  requestId: string,
): Promise<{ simulation: boolean; checkoutUrl: string | null }> {
  const payload = await authFetch<{ simulation: boolean; checkout_url: string | null }>(
    "/api/checkout/wave/my-driver",
    { method: "POST", body: JSON.stringify({ requestId }) },
  );
  return { simulation: payload.simulation, checkoutUrl: payload.checkout_url };
}

export async function startMyDriverSubscriptionPayment(): Promise<{
  simulation: boolean;
  checkoutUrl: string | null;
}> {
  const payload = await authFetch<{ simulation: boolean; checkout_url: string | null }>(
    "/api/checkout/wave/my-driver-subscription",
    { method: "POST" },
  );
  return { simulation: payload.simulation, checkoutUrl: payload.checkout_url };
}

export async function listAdminMyDriverProfiles(): Promise<MyDriverProfile[]> {
  const { data, error } = await supabase
    .from("my_driver_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MyDriverProfile[];
}

export async function listAdminMyDriverRequests(): Promise<MyDriverRequest[]> {
  const { data, error } = await supabase
    .from("my_driver_requests")
    .select(`
      *,
      assigned_driver:my_driver_profiles!assigned_driver_profile_id(
        id, full_name, city, photo_url, languages, years_experience,
        average_rating, completed_jobs
      )
    `)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as MyDriverRequest[];
}

export async function listAdminMyDriverSubscriptions(): Promise<MyDriverSubscription[]> {
  const { data, error } = await supabase
    .from("my_driver_subscriptions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MyDriverSubscription[];
}

export async function updateAdminMyDriverProfile(
  id: string,
  status: MyDriverProfile["status"],
  rejectionReason?: string,
): Promise<void> {
  const patch: Record<string, string | boolean | null> = {
    status,
    rejection_reason: status === "rejete" ? rejectionReason || "Dossier incomplet" : null,
    verified_at: status === "verifie" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  if (status !== "verifie") patch.is_available = false;
  const { error } = await supabase
    .from("my_driver_profiles")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function grantMyDriverWeeklySubscription(driverProfileId: string): Promise<void> {
  const { error } = await supabase.from("my_driver_subscriptions").insert({
    driver_profile_id: driverProfileId,
    plan: "hebdomadaire",
    amount_fcfa: 1000,
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
    status: "actif",
  });
  if (error) throw error;
}
