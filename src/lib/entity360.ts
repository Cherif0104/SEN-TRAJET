import { supabase } from "@/lib/supabase";

export type Entity360Type =
  | "client"
  | "provider"
  | "asset_partner"
  | "driver"
  | "vehicle";

export type TimelineEntry = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  occurred_at: string;
};

export type EntityCase = {
  id: string;
  case_type: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_at: string | null;
  created_at: string;
};

export type EntityContract = {
  id: string;
  contract_number: string;
  contract_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  amount_fcfa: number | null;
  billing_frequency: string | null;
  terms_summary: string | null;
  document_path: string | null;
};

export type EntityDocument = {
  id: string;
  document_type: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  status: string;
  issued_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type EntityFinancialRecord = {
  id: string;
  record_type: string;
  reference: string;
  label: string | null;
  amount_fcfa: number;
  status: string;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
};

export type VehicleMaintenanceRecord = {
  id: string;
  maintenance_type: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  odometer_km: number | null;
  cost_fcfa: number | null;
  service_provider: string | null;
  notes: string | null;
  next_due_at: string | null;
};

export type Entity360Data = {
  timeline: TimelineEntry[];
  cases: EntityCase[];
  contracts: EntityContract[];
  documents: EntityDocument[];
  financialRecords: EntityFinancialRecord[];
  maintenance: VehicleMaintenanceRecord[];
};

function assertResult(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function loadEntity360(
  entityType: Entity360Type,
  entityId: string,
): Promise<Entity360Data> {
  const [timeline, cases, contracts, documents, financialRecords, maintenance] =
    await Promise.all([
      supabase
        .from("entity_timeline")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("entity_cases")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false }),
      supabase
        .from("entity_contracts")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false }),
      supabase
        .from("entity_documents")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false }),
      supabase
        .from("entity_financial_records")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("issue_date", { ascending: false }),
      entityType === "vehicle"
        ? supabase
            .from("vehicle_maintenance_records")
            .select("*")
            .eq("vehicle_id", entityId)
            .order("scheduled_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

  [timeline, cases, contracts, documents, financialRecords, maintenance].forEach(
    (result) => assertResult(result.error),
  );

  return {
    timeline: (timeline.data ?? []) as TimelineEntry[],
    cases: (cases.data ?? []) as EntityCase[],
    contracts: (contracts.data ?? []) as EntityContract[],
    documents: (documents.data ?? []) as EntityDocument[],
    financialRecords: (financialRecords.data ?? []) as EntityFinancialRecord[],
    maintenance: (maintenance.data ?? []) as VehicleMaintenanceRecord[],
  };
}

export async function addTimelineEntry(
  entityType: Entity360Type,
  entityId: string,
  input: { eventType?: string; title: string; description?: string | null },
) {
  const { error } = await supabase.from("entity_timeline").insert({
    entity_type: entityType,
    entity_id: entityId,
    event_type: input.eventType ?? "note",
    title: input.title,
    description: input.description ?? null,
  });
  assertResult(error);
}

export async function addEntityCase(
  entityType: Entity360Type,
  entityId: string,
  input: {
    caseType: string;
    title: string;
    description?: string | null;
    priority: string;
    dueAt?: string | null;
  },
) {
  const { error } = await supabase.from("entity_cases").insert({
    entity_type: entityType,
    entity_id: entityId,
    case_type: input.caseType,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority,
    due_at: input.dueAt || null,
  });
  assertResult(error);
  await addTimelineEntry(entityType, entityId, {
    eventType: "case_created",
    title: `Dossier ouvert : ${input.title}`,
  });
}

export async function updateEntityCaseStatus(id: string, status: string) {
  const { error } = await supabase
    .from("entity_cases")
    .update({
      status,
      resolved_at: ["resolved", "closed"].includes(status)
        ? new Date().toISOString()
        : null,
    })
    .eq("id", id);
  assertResult(error);
}

export async function addEntityContract(
  entityType: Entity360Type,
  entityId: string,
  input: {
    contractNumber: string;
    contractType: string;
    status: string;
    startDate?: string | null;
    endDate?: string | null;
    amountFcfa?: number | null;
    billingFrequency?: string | null;
    termsSummary?: string | null;
  },
) {
  const { error } = await supabase.from("entity_contracts").insert({
    entity_type: entityType,
    entity_id: entityId,
    contract_number: input.contractNumber,
    contract_type: input.contractType,
    status: input.status,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    amount_fcfa: input.amountFcfa ?? null,
    billing_frequency: input.billingFrequency || null,
    terms_summary: input.termsSummary || null,
  });
  assertResult(error);
  await addTimelineEntry(entityType, entityId, {
    eventType: "contract_created",
    title: `Contrat ${input.contractNumber} ajouté`,
    description: input.termsSummary,
  });
}

export async function addFinancialRecord(
  entityType: Entity360Type,
  entityId: string,
  input: {
    recordType: string;
    reference: string;
    label?: string | null;
    amountFcfa: number;
    status: string;
    issueDate?: string | null;
    dueDate?: string | null;
  },
) {
  const { error } = await supabase.from("entity_financial_records").insert({
    entity_type: entityType,
    entity_id: entityId,
    record_type: input.recordType,
    reference: input.reference,
    label: input.label || null,
    amount_fcfa: input.amountFcfa,
    status: input.status,
    issue_date: input.issueDate || new Date().toISOString().slice(0, 10),
    due_date: input.dueDate || null,
  });
  assertResult(error);
  await addTimelineEntry(entityType, entityId, {
    eventType: "financial_record_created",
    title: `${input.reference} · ${input.amountFcfa.toLocaleString("fr-FR")} FCFA`,
  });
}

export async function uploadEntityDocument(
  actingUserId: string,
  entityType: Entity360Type,
  entityId: string,
  input: {
    file: File;
    documentType: string;
    name: string;
    expiresAt?: string | null;
  },
) {
  if (input.file.size > 10 * 1024 * 1024) {
    throw new Error("Fichier trop volumineux (10 Mo maximum).");
  }
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(input.file.type)) {
    throw new Error("Format accepté : JPG, PNG, WebP ou PDF.");
  }
  const extension = input.file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${actingUserId}/${entityType}/${entityId}/${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("entity-documents")
    .upload(path, input.file);
  assertResult(uploadError);

  const { error } = await supabase.from("entity_documents").insert({
    entity_type: entityType,
    entity_id: entityId,
    document_type: input.documentType,
    name: input.name,
    storage_path: path,
    mime_type: input.file.type,
    expires_at: input.expiresAt || null,
  });
  if (error) {
    await supabase.storage.from("entity-documents").remove([path]);
    throw new Error(error.message);
  }
  await addTimelineEntry(entityType, entityId, {
    eventType: "document_uploaded",
    title: `Document ajouté : ${input.name}`,
  });
}

export async function signedEntityDocumentUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("entity-documents")
    .createSignedUrl(path, 300);
  assertResult(error);
  return data!.signedUrl;
}

export async function addVehicleMaintenance(
  vehicleId: string,
  input: {
    maintenanceType: string;
    title: string;
    status: string;
    scheduledAt?: string | null;
    odometerKm?: number | null;
    costFcfa?: number | null;
    serviceProvider?: string | null;
    notes?: string | null;
    nextDueAt?: string | null;
  },
) {
  const { error } = await supabase.from("vehicle_maintenance_records").insert({
    vehicle_id: vehicleId,
    maintenance_type: input.maintenanceType,
    title: input.title,
    status: input.status,
    scheduled_at: input.scheduledAt || null,
    odometer_km: input.odometerKm ?? null,
    cost_fcfa: input.costFcfa ?? null,
    service_provider: input.serviceProvider || null,
    notes: input.notes || null,
    next_due_at: input.nextDueAt || null,
  });
  assertResult(error);
  await addTimelineEntry("vehicle", vehicleId, {
    eventType: "maintenance_created",
    title: `Entretien : ${input.title}`,
  });
}
