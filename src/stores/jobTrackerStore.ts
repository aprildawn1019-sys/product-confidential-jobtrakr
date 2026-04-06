import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Job, Contact, Interview, JobStatus, JobContact, ContactConnection, ContactActivity, Campaign, ContactCampaign, RecommendationRequest, SkillsSnapshot, JobActivity, TargetCompany } from "@/types/jobTracker";

/** Normalize a company name for fuzzy matching */
function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,.]/g, "")
    .replace(/\b(inc|llc|ltd|corp|corporation|co|company|group|plc|lp|gmbh|ag|sa|srl|pty)\b/gi, "")
    .replace(/\(.*?\)/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/** Check if two company names likely refer to the same organization */
export function companiesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const na = normalizeCompany(a);
  const nb = normalizeCompany(b);
  if (na === nb) return true;
  if (na.length >= 3 && nb.length >= 3) {
    if (na.includes(nb) || nb.includes(na)) return true;
  }
  return false;
}

function mapJob(row: any): Job {
  return {
    id: row.id, company: row.company, title: row.title, location: row.location,
    type: row.type, salary: row.salary ?? undefined, url: row.url ?? undefined,
    status: row.status, appliedDate: row.applied_date ?? undefined,
    notes: row.notes ?? undefined, description: row.description ?? undefined,
    contactId: row.contact_id ?? undefined,
    createdAt: row.created_at, statusUpdatedAt: row.status_updated_at ?? undefined,
    posterName: row.poster_name ?? undefined, posterEmail: row.poster_email ?? undefined,
    posterPhone: row.poster_phone ?? undefined, posterRole: row.poster_role ?? undefined,
    fitScore: row.fit_score ?? undefined, urgency: row.urgency ?? undefined,
    source: row.source ?? "manual",
  };
}

function mapContact(row: any): Contact {
  return {
    id: row.id, name: row.name, company: row.company, role: row.role,
    email: row.email ?? undefined, phone: row.phone ?? undefined,
    linkedin: row.linkedin ?? undefined, notes: row.notes ?? undefined,
    lastContactedAt: row.last_contacted_at ?? undefined, createdAt: row.created_at,
    relationshipWarmth: row.relationship_warmth ?? undefined,
    followUpDate: row.follow_up_date ?? undefined,
    conversationLog: row.conversation_log ?? undefined,
  };
}

function mapInterview(row: any): Interview {
  return {
    id: row.id, jobId: row.job_id, type: row.type, date: row.date,
    time: row.time ?? undefined, notes: row.notes ?? undefined, status: row.status,
  };
}

function mapJobContact(row: any): JobContact {
  return { id: row.id, jobId: row.job_id, contactId: row.contact_id, createdAt: row.created_at };
}

function mapContactConnection(row: any): ContactConnection {
  return {
    id: row.id, contactId1: row.contact_id_1, contactId2: row.contact_id_2,
    connectionType: row.connection_type, notes: row.notes ?? undefined, createdAt: row.created_at,
  };
}

function mapContactActivity(row: any): ContactActivity {
  return {
    id: row.id, contactId: row.contact_id, activityType: row.activity_type,
    activityDate: row.activity_date, notes: row.notes ?? undefined, createdAt: row.created_at,
  };
}

function mapCampaign(row: any): Campaign {
  return {
    id: row.id, name: row.name, type: row.type,
    description: row.description ?? undefined, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapContactCampaign(row: any): ContactCampaign {
  return { id: row.id, contactId: row.contact_id, campaignId: row.campaign_id, createdAt: row.created_at };
}

function mapRecommendationRequest(row: any): RecommendationRequest {
  return {
    id: row.id, contactId: row.contact_id, requestedAt: row.requested_at,
    receivedAt: row.received_at ?? undefined, notes: row.notes ?? undefined,
    status: row.status, createdAt: row.created_at,
  };
}

function mapJobActivity(row: any): JobActivity {
  return {
    id: row.id, jobId: row.job_id, activityType: row.activity_type,
    activityDate: row.activity_date, contactId: row.contact_id ?? undefined,
    notes: row.notes ?? undefined, createdAt: row.created_at,
  };
}

function mapTargetCompany(row: any): TargetCompany {
  return {
    id: row.id, name: row.name, website: row.website ?? undefined,
    careersUrl: row.careers_url ?? undefined, industry: row.industry ?? undefined,
    size: row.size ?? undefined, priority: row.priority, status: row.status,
    notes: row.notes ?? undefined, logoUrl: row.logo_url ?? undefined,
    createdAt: row.created_at,
  };
}

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export function useJobTrackerStore() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [jobContacts, setJobContacts] = useState<JobContact[]>([]);
  const [contactConnections, setContactConnections] = useState<ContactConnection[]>([]);
  const [contactActivities, setContactActivities] = useState<ContactActivity[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contactCampaigns, setContactCampaigns] = useState<ContactCampaign[]>([]);
  const [recommendationRequests, setRecommendationRequests] = useState<RecommendationRequest[]>([]);
  const [jobActivities, setJobActivities] = useState<JobActivity[]>([]);
  const [targetCompanies, setTargetCompanies] = useState<TargetCompany[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [jobsRes, contactsRes, interviewsRes, jobContactsRes, connectionsRes, activitiesRes, campaignsRes, contactCampaignsRes, recReqRes, jobActRes, targetCoRes] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }).range(0, 9999),
      supabase.from("contacts").select("*").order("created_at", { ascending: false }).range(0, 9999),
      supabase.from("interviews").select("*").order("date", { ascending: true }).range(0, 9999),
      supabase.from("job_contacts").select("*").range(0, 9999),
      supabase.from("contact_connections").select("*").range(0, 9999),
      supabase.from("contact_activities").select("*").order("activity_date", { ascending: false }).range(0, 9999),
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }).range(0, 9999),
      supabase.from("contact_campaigns").select("*").range(0, 9999),
      supabase.from("recommendation_requests").select("*").order("requested_at", { ascending: false }).range(0, 9999),
      supabase.from("job_activities").select("*").order("activity_date", { ascending: false }).range(0, 9999),
      supabase.from("target_companies").select("*").order("created_at", { ascending: false }).range(0, 9999),
    ]);
    if (jobsRes.data) setJobs(jobsRes.data.map(mapJob));
    if (contactsRes.data) setContacts(contactsRes.data.map(mapContact));
    if (interviewsRes.data) setInterviews(interviewsRes.data.map(mapInterview));
    if (jobContactsRes.data) setJobContacts(jobContactsRes.data.map(mapJobContact));
    if (connectionsRes.data) setContactConnections(connectionsRes.data.map(mapContactConnection));
    if (activitiesRes.data) setContactActivities(activitiesRes.data.map(mapContactActivity));
    if (campaignsRes.data) setCampaigns(campaignsRes.data.map(mapCampaign));
    if (contactCampaignsRes.data) setContactCampaigns(contactCampaignsRes.data.map(mapContactCampaign));
    if (recReqRes.data) setRecommendationRequests(recReqRes.data.map(mapRecommendationRequest));
    if (jobActRes.data) setJobActivities(jobActRes.data.map(mapJobActivity));
    if (targetCoRes.data) setTargetCompanies(targetCoRes.data.map(mapTargetCompany));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // === JOBS ===
  const addJob = async (job: Omit<Job, "id" | "createdAt">) => {
    const userId = await getUserId();
    if (!userId) return;
    const { data } = await supabase.from("jobs").insert({
      user_id: userId, company: job.company, title: job.title, location: job.location,
      type: job.type, salary: job.salary || null, url: job.url || null,
      status: job.status, applied_date: job.appliedDate || null, notes: job.notes || null,
      description: job.description || null,
      contact_id: job.contactId || null, poster_name: job.posterName || null,
      poster_email: job.posterEmail || null, poster_phone: job.posterPhone || null,
      poster_role: job.posterRole || null, fit_score: job.fitScore || null,
      urgency: job.urgency || null, source: job.source || "manual",
    }).select().single();
    if (data) {
      const newJob = mapJob(data);
      setJobs(prev => [newJob, ...prev]);
      // Auto-extract skills if description is present
      if (job.description && job.description.length >= 20) {
        try {
          const { data: skillsData } = await supabase.functions.invoke("extract-job-skills", {
            body: { description: job.description },
          });
          if (skillsData?.skills?.length) {
            await supabase.from("job_skills_snapshots").insert({
              user_id: userId, job_id: newJob.id, skills: skillsData.skills,
            });
          }
        } catch (e) {
          console.error("Skills extraction failed:", e);
        }
      }
    }
  };

  const addJobsBulk = async (jobsList: Omit<Job, "id" | "createdAt">[]) => {
    const userId = await getUserId();
    if (!userId || jobsList.length === 0) return;
    const rows = jobsList.map(job => ({
      user_id: userId, company: job.company, title: job.title, location: job.location,
      type: job.type, salary: job.salary || null, url: job.url || null,
      status: job.status, applied_date: job.appliedDate || null, notes: job.notes || null,
      description: job.description || null, contact_id: job.contactId || null,
      poster_name: job.posterName || null, poster_email: job.posterEmail || null,
      poster_phone: job.posterPhone || null, poster_role: job.posterRole || null,
      fit_score: job.fitScore || null, urgency: job.urgency || null,
    }));
    const { data } = await supabase.from("jobs").insert(rows).select();
    if (data) setJobs(prev => [...data.map(mapJob), ...prev]);
  };

  const updateJobStatus = async (id: string, status: JobStatus) => {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status, status_updated_at: now };
    const stateUpdates: Partial<Job> = { status, statusUpdatedAt: now };
    // Auto-set applied date when moving to "applied"
    if (status === "applied") {
      const job = jobs.find(j => j.id === id);
      if (job && !job.appliedDate) {
        const today = now.split("T")[0];
        updates.applied_date = today;
        stateUpdates.appliedDate = today;
      }
    }
    await supabase.from("jobs").update(updates).eq("id", id);
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...stateUpdates } : j));
  };

  const updateJob = async (id: string, updates: Partial<Job>) => {
    const dbUpdates: any = {};
    if (updates.company !== undefined) dbUpdates.company = updates.company;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.salary !== undefined) dbUpdates.salary = updates.salary || null;
    if (updates.url !== undefined) dbUpdates.url = updates.url || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;
    if (updates.posterName !== undefined) dbUpdates.poster_name = updates.posterName || null;
    if (updates.posterEmail !== undefined) dbUpdates.poster_email = updates.posterEmail || null;
    if (updates.posterPhone !== undefined) dbUpdates.poster_phone = updates.posterPhone || null;
    if (updates.posterRole !== undefined) dbUpdates.poster_role = updates.posterRole || null;
    if (updates.fitScore !== undefined) dbUpdates.fit_score = updates.fitScore || null;
    if (updates.urgency !== undefined) dbUpdates.urgency = updates.urgency || null;
    if (updates.status !== undefined) {
      dbUpdates.status = updates.status;
      dbUpdates.status_updated_at = new Date().toISOString();
    }
    if (updates.appliedDate !== undefined) dbUpdates.applied_date = updates.appliedDate || null;
    await supabase.from("jobs").update(dbUpdates).eq("id", id);
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const deleteJob = async (id: string) => {
    await supabase.from("job_contacts").delete().eq("job_id", id);
    setJobContacts(prev => prev.filter(jc => jc.jobId !== id));
    await supabase.from("jobs").delete().eq("id", id);
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  // === CONTACTS ===
  const addContact = async (contact: Omit<Contact, "id" | "createdAt">) => {
    const userId = await getUserId();
    if (!userId) return;
    const { data } = await supabase.from("contacts").insert({
      user_id: userId, name: contact.name, company: contact.company, role: contact.role,
      email: contact.email || null, phone: contact.phone || null,
      linkedin: contact.linkedin || null, notes: contact.notes || null,
      last_contacted_at: contact.lastContactedAt || null,
      relationship_warmth: contact.relationshipWarmth || null,
      follow_up_date: contact.followUpDate || null,
      conversation_log: contact.conversationLog || null,
    }).select().single();
    if (data) setContacts(prev => [mapContact(data), ...prev]);
  };

  const addContactsBulk = async (contactsList: Omit<Contact, "id" | "createdAt">[]) => {
    const userId = await getUserId();
    if (!userId || contactsList.length === 0) return;
    const rows = contactsList.map(c => ({
      user_id: userId, name: c.name, company: c.company, role: c.role,
      email: c.email || null, phone: c.phone || null,
      linkedin: c.linkedin || null, notes: c.notes || null,
      last_contacted_at: c.lastContactedAt || null,
    }));
    const { data } = await supabase.from("contacts").insert(rows).select();
    if (data) setContacts(prev => [...data.map(mapContact), ...prev]);
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.company !== undefined) dbUpdates.company = updates.company;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.email !== undefined) dbUpdates.email = updates.email || null;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
    if (updates.linkedin !== undefined) dbUpdates.linkedin = updates.linkedin || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    if (updates.relationshipWarmth !== undefined) dbUpdates.relationship_warmth = updates.relationshipWarmth || null;
    if (updates.followUpDate !== undefined) dbUpdates.follow_up_date = updates.followUpDate || null;
    if (updates.conversationLog !== undefined) dbUpdates.conversation_log = updates.conversationLog || null;
    if (updates.lastContactedAt !== undefined) dbUpdates.last_contacted_at = updates.lastContactedAt || null;
    await supabase.from("contacts").update(dbUpdates).eq("id", id);
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteContact = async (id: string) => {
    await Promise.all([
      supabase.from("job_contacts").delete().eq("contact_id", id),
      supabase.from("contact_connections").delete().or(`contact_id_1.eq.${id},contact_id_2.eq.${id}`),
      supabase.from("contact_campaigns").delete().eq("contact_id", id),
    ]);
    setJobContacts(prev => prev.filter(jc => jc.contactId !== id));
    setContactConnections(prev => prev.filter(cc => cc.contactId1 !== id && cc.contactId2 !== id));
    setContactActivities(prev => prev.filter(ca => ca.contactId !== id));
    setContactCampaigns(prev => prev.filter(cc => cc.contactId !== id));
    await supabase.from("contacts").delete().eq("id", id);
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  // === INTERVIEWS ===
  const addInterview = async (interview: Omit<Interview, "id">) => {
    const userId = await getUserId();
    if (!userId) return;
    const { data } = await supabase.from("interviews").insert({
      user_id: userId, job_id: interview.jobId, type: interview.type,
      date: interview.date, time: interview.time || null,
      notes: interview.notes || null, status: interview.status,
    }).select().single();
    if (data) setInterviews(prev => [...prev, mapInterview(data)]);
  };

  const updateInterview = async (id: string, updates: Partial<Interview>) => {
    const dbUpdates: any = {};
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.time !== undefined) dbUpdates.time = updates.time || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    await supabase.from("interviews").update(dbUpdates).eq("id", id);
    setInterviews(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const deleteInterview = async (id: string) => {
    await supabase.from("interviews").delete().eq("id", id);
    setInterviews(prev => prev.filter(i => i.id !== id));
  };

  // === JOB-CONTACT LINKS ===
  const linkContactToJob = async (jobId: string, contactId: string) => {
    const userId = await getUserId();
    if (!userId) return;
    const { data } = await supabase.from("job_contacts").insert({
      user_id: userId, job_id: jobId, contact_id: contactId,
    }).select().single();
    if (data) setJobContacts(prev => [...prev, mapJobContact(data)]);
  };

  const unlinkContactFromJob = async (jobId: string, contactId: string) => {
    await supabase.from("job_contacts").delete().eq("job_id", jobId).eq("contact_id", contactId);
    setJobContacts(prev => prev.filter(jc => !(jc.jobId === jobId && jc.contactId === contactId)));
  };

  const getContactsForJob = (jobId: string) => {
    const linkedIds = jobContacts.filter(jc => jc.jobId === jobId).map(jc => jc.contactId);
    return contacts.filter(c => linkedIds.includes(c.id));
  };

  const getNetworkMatchesForJob = (job: Job) => {
    const linkedIds = jobContacts.filter(jc => jc.jobId === job.id).map(jc => jc.contactId);
    return contacts.filter(c => companiesMatch(job.company, c.company) && !linkedIds.includes(c.id));
  };

  const getJobsForContact = (contactId: string) => {
    const linkedJobIds = jobContacts.filter(jc => jc.contactId === contactId).map(jc => jc.jobId);
    return jobs.filter(j => linkedJobIds.includes(j.id));
  };

  // === CONTACT CONNECTIONS ===
  const addContactConnection = async (contactId1: string, contactId2: string, connectionType = "linkedin", notes?: string) => {
    const userId = await getUserId();
    if (!userId) return;
    const { data } = await supabase.from("contact_connections").insert({
      user_id: userId, contact_id_1: contactId1, contact_id_2: contactId2,
      connection_type: connectionType, notes: notes || null,
    }).select().single();
    if (data) setContactConnections(prev => [...prev, mapContactConnection(data)]);
  };

  const removeContactConnection = async (id: string) => {
    await supabase.from("contact_connections").delete().eq("id", id);
    setContactConnections(prev => prev.filter(cc => cc.id !== id));
  };

  const getConnectionsForContact = (contactId: string) => {
    return contactConnections.filter(
      cc => cc.contactId1 === contactId || cc.contactId2 === contactId
    ).map(cc => {
      const otherId = cc.contactId1 === contactId ? cc.contactId2 : cc.contactId1;
      const otherContact = contacts.find(c => c.id === otherId);
      return { ...cc, contact: otherContact };
    });
  };

  const getContactsAtSameOrg = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return [];
    return contacts.filter(c => c.id !== contactId && companiesMatch(contact.company, c.company));
  };

  // === CONTACT ACTIVITIES ===
  const addContactActivity = async (activity: Omit<ContactActivity, "id" | "createdAt">) => {
    const userId = await getUserId();
    if (!userId) return;
    const { data } = await supabase.from("contact_activities").insert({
      user_id: userId, contact_id: activity.contactId,
      activity_type: activity.activityType, activity_date: activity.activityDate,
      notes: activity.notes || null,
    }).select().single();
    if (data) {
      setContactActivities(prev => [mapContactActivity(data), ...prev]);
      setContacts(prev => prev.map(c => {
        if (c.id === activity.contactId && (!c.lastContactedAt || c.lastContactedAt < activity.activityDate)) {
          return { ...c, lastContactedAt: activity.activityDate };
        }
        return c;
      }));
    }
  };

  const deleteContactActivity = async (id: string) => {
    await supabase.from("contact_activities").delete().eq("id", id);
    setContactActivities(prev => prev.filter(ca => ca.id !== id));
  };

  const getActivitiesForContact = (contactId: string) => {
    return contactActivities.filter(ca => ca.contactId === contactId);
  };

  // === CAMPAIGNS ===
  const addCampaign = async (campaign: Omit<Campaign, "id" | "createdAt" | "updatedAt">) => {
    const userId = await getUserId();
    if (!userId) return;
    const { data } = await supabase.from("campaigns").insert({
      user_id: userId, name: campaign.name, type: campaign.type,
      description: campaign.description || null, status: campaign.status,
    }).select().single();
    if (data) setCampaigns(prev => [mapCampaign(data), ...prev]);
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    await supabase.from("campaigns").update(dbUpdates).eq("id", id);
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: dbUpdates.updated_at } : c));
  };

  const deleteCampaign = async (id: string) => {
    await supabase.from("contact_campaigns").delete().eq("campaign_id", id);
    setContactCampaigns(prev => prev.filter(cc => cc.campaignId !== id));
    await supabase.from("campaigns").delete().eq("id", id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  const toggleContactCampaign = async (contactId: string, campaignId: string) => {
    const existing = contactCampaigns.find(cc => cc.contactId === contactId && cc.campaignId === campaignId);
    if (existing) {
      await supabase.from("contact_campaigns").delete().eq("id", existing.id);
      setContactCampaigns(prev => prev.filter(cc => cc.id !== existing.id));
    } else {
      const userId = await getUserId();
      if (!userId) return;
      const { data } = await supabase.from("contact_campaigns").insert({
        user_id: userId, contact_id: contactId, campaign_id: campaignId,
      }).select().single();
      if (data) setContactCampaigns(prev => [...prev, mapContactCampaign(data)]);
    }
  };

  const getCampaignsForContact = (contactId: string) => {
    const campaignIds = contactCampaigns.filter(cc => cc.contactId === contactId).map(cc => cc.campaignId);
    return campaigns.filter(c => campaignIds.includes(c.id));
  };

  const getContactsForCampaign = (campaignId: string) => {
    const contactIds = contactCampaigns.filter(cc => cc.campaignId === campaignId).map(cc => cc.contactId);
    return contacts.filter(c => contactIds.includes(c.id));
  };

  // === RECOMMENDATION REQUESTS ===
  const addRecommendationRequest = async (req: Omit<RecommendationRequest, "id" | "createdAt">) => {
    const userId = await getUserId();
    if (!userId) return;
    const { data } = await supabase.from("recommendation_requests").insert({
      user_id: userId, contact_id: req.contactId, requested_at: req.requestedAt,
      received_at: req.receivedAt || null, notes: req.notes || null, status: req.status,
    }).select().single();
    if (data) setRecommendationRequests(prev => [mapRecommendationRequest(data), ...prev]);
  };

  const updateRecommendationRequest = async (id: string, updates: Partial<RecommendationRequest>) => {
    const dbUpdates: any = {};
    if (updates.requestedAt !== undefined) dbUpdates.requested_at = updates.requestedAt;
    if (updates.receivedAt !== undefined) dbUpdates.received_at = updates.receivedAt || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    await supabase.from("recommendation_requests").update(dbUpdates).eq("id", id);
    setRecommendationRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRecommendationRequest = async (id: string) => {
    await supabase.from("recommendation_requests").delete().eq("id", id);
    setRecommendationRequests(prev => prev.filter(r => r.id !== id));
  };

  const getRecommendationRequestsForContact = (contactId: string) => {
    return recommendationRequests.filter(r => r.contactId === contactId);
  };

  // === JOB ACTIVITIES ===
  const addJobActivity = async (activity: Omit<JobActivity, "id" | "createdAt">) => {
    const userId = await getUserId();
    if (!userId) return;
    const { data } = await supabase.from("job_activities").insert({
      user_id: userId, job_id: activity.jobId, activity_type: activity.activityType,
      activity_date: activity.activityDate, contact_id: activity.contactId || null,
      notes: activity.notes || null,
    }).select().single();
    if (data) setJobActivities(prev => [mapJobActivity(data), ...prev]);
  };

  const deleteJobActivity = async (id: string) => {
    await supabase.from("job_activities").delete().eq("id", id);
    setJobActivities(prev => prev.filter(ja => ja.id !== id));
  };

  const getJobActivitiesForJob = (jobId: string) => {
    return jobActivities.filter(ja => ja.jobId === jobId);
  };

  // === HELPERS ===
  const getJobsByStatus = (status: JobStatus) => jobs.filter(j => j.status === status);
  const getContactForJob = (contactId?: string) => contacts.find(c => c.id === contactId);
  const getInterviewsForJob = (jobId: string) => interviews.filter(i => i.jobId === jobId);

  return {
    jobs, contacts, interviews, jobContacts, contactConnections, contactActivities, campaigns, contactCampaigns, recommendationRequests, jobActivities, loading,
    addJob, addJobsBulk, updateJobStatus, updateJob, deleteJob,
    addContact, addContactsBulk, updateContact, deleteContact,
    addInterview, updateInterview, deleteInterview,
    linkContactToJob, unlinkContactFromJob, getContactsForJob, getNetworkMatchesForJob, getJobsForContact,
    addContactConnection, removeContactConnection, getConnectionsForContact, getContactsAtSameOrg,
    addContactActivity, deleteContactActivity, getActivitiesForContact,
    addCampaign, updateCampaign, deleteCampaign, toggleContactCampaign, getCampaignsForContact, getContactsForCampaign,
    addRecommendationRequest, updateRecommendationRequest, deleteRecommendationRequest, getRecommendationRequestsForContact,
    addJobActivity, deleteJobActivity, getJobActivitiesForJob,
    getJobsByStatus, getContactForJob, getInterviewsForJob,
  };
}
