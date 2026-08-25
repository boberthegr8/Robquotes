export const FORGE_CORE_CONFIG = {
  url: 'https://uyqanhwurngoupmvzxrh.supabase.co',
  publishableKey: 'sb_publishable_SquKrj848EoO9NHZknVkSA_k8CKD7WQ',
  supabaseJsUrl: 'https://esm.sh/@supabase/supabase-js@2.112.4',
  documentBucket: 'forge-documents',
  defaultLocationCode: 'JK-MAIN'
} as const;

type SupabaseClientLike = any;
let clientPromise: Promise<SupabaseClientLike> | null = null;

export interface ReaderContext {
  userId: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: string;
  locationId?: string;
  locationName?: string;
}

export interface ReaderCustomer {
  id: string;
  name: string;
}

export interface ReaderProject {
  id: string;
  name: string;
  customerId?: string;
  customerName?: string;
}

export interface ReaderDocument {
  id: string;
  title: string;
  filename: string;
  documentType: string;
  status: string;
  createdAt: string;
  projectId?: string;
  projectName?: string;
  customerId?: string;
  customerName?: string;
  sha256?: string;
  fileSizeBytes?: number;
  storagePath: string;
  analysis?: {
    id: string;
    status: string;
    analysisType: string;
    pageCount?: number;
    warnings: unknown[];
    errorMessage?: string;
    createdAt: string;
  };
}

export interface ReaderWorkspace {
  context: ReaderContext | null;
  customers: ReaderCustomer[];
  projects: ReaderProject[];
  documents: ReaderDocument[];
}

export async function getForgeCoreClient(): Promise<SupabaseClientLike> {
  if (!clientPromise) {
    clientPromise = import(/* @vite-ignore */ FORGE_CORE_CONFIG.supabaseJsUrl).then((module: any) =>
      module.createClient(FORGE_CORE_CONFIG.url, FORGE_CORE_CONFIG.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    );
  }
  return clientPromise;
}

export async function sendReaderMagicLink(email: string) {
  const cleanEmail = email.trim();
  if (!cleanEmail) throw new Error('Enter your Forge email address.');
  const client = await getForgeCoreClient();
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await client.auth.signInWithOtp({
    email: cleanEmail,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo }
  });
  if (error) throw error;
}

export async function signOutReader() {
  const client = await getForgeCoreClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getReaderContext(): Promise<ReaderContext | null> {
  const client = await getForgeCoreClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData?.user) return null;

  const { data: memberships, error: membershipError } = await client
    .from('organization_memberships')
    .select('organization_id, role, status')
    .eq('user_id', userData.user.id)
    .eq('status', 'active')
    .limit(1);
  if (membershipError) throw membershipError;
  const membership = memberships?.[0];
  if (!membership) return {
    userId: userData.user.id,
    email: userData.user.email || '',
    organizationId: '',
    organizationName: '',
    role: 'unassigned'
  };

  const [organizationResult, locationResult] = await Promise.all([
    client.from('organizations').select('id,name').eq('id', membership.organization_id).single(),
    client.from('locations').select('id,name,code').eq('organization_id', membership.organization_id).eq('status', 'active').order('name')
  ]);
  if (organizationResult.error) throw organizationResult.error;
  if (locationResult.error) throw locationResult.error;
  const location = (locationResult.data || []).find((row: any) => row.code === FORGE_CORE_CONFIG.defaultLocationCode) || locationResult.data?.[0];

  return {
    userId: userData.user.id,
    email: userData.user.email || '',
    organizationId: membership.organization_id,
    organizationName: organizationResult.data?.name || 'Forge Organization',
    role: membership.role,
    locationId: location?.id,
    locationName: location?.name
  };
}

const text = (value: unknown) => String(value ?? '').trim();

export async function loadReaderWorkspace(): Promise<ReaderWorkspace> {
  const context = await getReaderContext();
  if (!context?.organizationId) return { context, customers: [], projects: [], documents: [] };
  const client = await getForgeCoreClient();

  const [customerResult, projectResult, documentResult, analysisResult] = await Promise.all([
    client.from('customers').select('id,display_name').eq('organization_id', context.organizationId).order('display_name'),
    client.from('projects').select('id,name,customer_id').eq('organization_id', context.organizationId).order('created_at', { ascending: false }),
    client.from('documents').select('id,title,original_filename,document_type,status,created_at,project_id,customer_id,sha256,file_size_bytes,storage_path').eq('organization_id', context.organizationId).order('created_at', { ascending: false }).limit(200),
    client.from('document_analysis_runs').select('id,document_id,status,analysis_type,page_count,warnings,error_message,created_at').eq('organization_id', context.organizationId).order('created_at', { ascending: false }).limit(500)
  ]);
  for (const result of [customerResult, projectResult, documentResult, analysisResult]) if (result.error) throw result.error;

  const customers: ReaderCustomer[] = (customerResult.data || []).map((row: any) => ({ id: row.id, name: row.display_name }));
  const customerById = new Map(customers.map(customer => [customer.id, customer]));
  const projects: ReaderProject[] = (projectResult.data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    customerId: row.customer_id || undefined,
    customerName: row.customer_id ? customerById.get(row.customer_id)?.name : undefined
  }));
  const projectById = new Map(projects.map(project => [project.id, project]));
  const latestAnalysisByDocument = new Map<string, any>();
  for (const run of analysisResult.data || []) if (!latestAnalysisByDocument.has(run.document_id)) latestAnalysisByDocument.set(run.document_id, run);

  const documents: ReaderDocument[] = (documentResult.data || []).map((row: any) => {
    const run = latestAnalysisByDocument.get(row.id);
    const project = row.project_id ? projectById.get(row.project_id) : undefined;
    const customerId = row.customer_id || project?.customerId;
    return {
      id: row.id,
      title: row.title || row.original_filename,
      filename: row.original_filename,
      documentType: row.document_type,
      status: row.status,
      createdAt: row.created_at,
      projectId: row.project_id || undefined,
      projectName: project?.name,
      customerId: customerId || undefined,
      customerName: customerId ? customerById.get(customerId)?.name : undefined,
      sha256: row.sha256 || undefined,
      fileSizeBytes: row.file_size_bytes || undefined,
      storagePath: row.storage_path,
      analysis: run ? {
        id: run.id,
        status: run.status,
        analysisType: run.analysis_type,
        pageCount: run.page_count || undefined,
        warnings: Array.isArray(run.warnings) ? run.warnings : [],
        errorMessage: run.error_message || undefined,
        createdAt: run.created_at
      } : undefined
    };
  });

  return { context, customers, projects, documents };
}

async function sha256File(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function safeFilename(name: string) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'document.pdf';
}

export async function uploadReaderDocument(file: File, options: {
  projectId?: string;
  customerId?: string;
  documentType: string;
  title?: string;
}) {
  const context = await getReaderContext();
  if (!context?.organizationId) throw new Error('Sign into Forge Core before uploading documents.');
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Forge Reader v1 currently accepts PDF files only.');

  const client = await getForgeCoreClient();
  const sha256 = await sha256File(file);
  const { data: duplicates, error: duplicateError } = await client
    .from('documents')
    .select('id,title,original_filename,storage_path')
    .eq('organization_id', context.organizationId)
    .eq('sha256', sha256)
    .limit(1);
  if (duplicateError) throw duplicateError;
  if (duplicates?.[0]) return { duplicate: true, documentId: duplicates[0].id, existing: duplicates[0] };

  const documentId = crypto.randomUUID();
  const storagePath = `${context.organizationId}/reader/${documentId}/${safeFilename(file.name)}`;
  const { error: uploadError } = await client.storage.from(FORGE_CORE_CONFIG.documentBucket).upload(storagePath, file, {
    contentType: file.type || 'application/pdf',
    upsert: false
  });
  if (uploadError) throw uploadError;

  try {
    const { error: documentError } = await client.from('documents').insert({
      id: documentId,
      organization_id: context.organizationId,
      location_id: context.locationId || null,
      project_id: options.projectId || null,
      customer_id: options.customerId || null,
      document_type: options.documentType || 'drawing_set',
      title: text(options.title) || file.name,
      original_filename: file.name,
      storage_bucket: FORGE_CORE_CONFIG.documentBucket,
      storage_path: storagePath,
      mime_type: file.type || 'application/pdf',
      file_size_bytes: file.size,
      sha256,
      status: 'uploaded',
      source: 'forge-reader',
      metadata: { reader_version: 1 },
      created_by: context.userId
    });
    if (documentError) throw documentError;

    const { data: analysis, error: analysisError } = await client.from('document_analysis_runs').insert({
      organization_id: context.organizationId,
      location_id: context.locationId || null,
      document_id: documentId,
      project_id: options.projectId || null,
      analysis_type: 'reader_intake',
      status: 'queued',
      parser: 'forge-reader-v1',
      extracted_data: {},
      warnings: [],
      created_by: context.userId
    }).select('id').single();
    if (analysisError) throw analysisError;

    await client.from('events').insert({
      organization_id: context.organizationId,
      location_id: context.locationId || null,
      entity_type: 'document',
      entity_id: documentId,
      action: 'reader_uploaded',
      payload: { analysis_run_id: analysis.id, filename: file.name, sha256 },
      source: 'forge-reader',
      actor_user_id: context.userId
    });

    return { duplicate: false, documentId, analysisRunId: analysis.id };
  } catch (error) {
    await client.storage.from(FORGE_CORE_CONFIG.documentBucket).remove([storagePath]);
    throw error;
  }
}
