import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Job, Contact, Interview, JobStatus, JobContact, ContactConnection } from "@/types/jobTracker";

function mapJob(row: any): Job {
  return {
    id: row.id,
    company: row.company,
    title: row.title,
    location: row.location,
    type: row.type,
    salary: row.salary ?? undefined,
    url: row.url ?? undefined,
    status: row.status,
    appliedDate: row.applied_date ?? undefined,
    notes: row.notes ?? undefined,
    contactId: row.contact_id ?? undefined,
    createdAt: row.created_at,
    statusUpdatedAt: row.status_updated_at ?? undefined,
    posterName: row.poster_name ?? undefined,
    posterEmail: row.poster_email ?? undefined,
    posterPhone: row.poster_phone ?? undefined,
    posterRole: row.poster_role ?? undefined,
  };
}

function mapContact(row: any): Contact {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    role: row.role,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    linkedin: row.linkedin ?? undefined,
    notes: row.notes ?? undefined,
    lastContactedAt: row.last_contacted_at ?? undefined,
    createdAt: row.created_at,
  };
}

function mapInterview(row: any): Interview {
  return {
    id: row.id,
    jobId: row.job_id,
    type: row.type,
    date: row.date,
    time: row.time ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
  };
}

function mapJobContact(row: any): JobContact {
  return {
    id: row.id,
    jobId: row.job_id,
    contactId: row.contact_id,
    createdAt: row.created_at,
  };
}

function mapContactConnection(row: any): ContactConnection {
  return {
    id: row.id,
    contactId1: row.contact_id_1,
    contactId2: row.contact_id_2,
    connectionType: row.connection_type,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function useJobTrackerStore() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [jobContacts, setJobContacts] = useState<JobContact[]>([]);
  const [contactConnections, setContactConnections] = useState<ContactConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [jobsRes, contactsRes, interviewsRes, jobContactsRes, connectionsRes] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("interviews").select("*").order("date", { ascending: true }),
      supabase.from("job_contacts").select("*"),
      supabase.from("contact_connections").select("*"),
    ]);
    if (jobsRes.data) setJobs(jobsRes.data.map(mapJob));
    if (contactsRes.data) setContacts(contactsRes.data.map(mapContact));
    if (interviewsRes.data) setInterviews(interviewsRes.data.map(mapInterview));
    if (jobContactsRes.data) setJobContacts(jobContactsRes.data.map(mapJobContact));
    if (connectionsRes.data) setContactConnections(connectionsRes.data.map(mapContactConnection));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addJob = async (job: Omit<Job, "id" | "createdAt">) => {
    const { data, error } = await supabase.from("jobs").insert({
      company: job.company,
      title: job.title,
      location: job.location,
      type: job.type,
      salary: job.salary || null,
      url: job.url || null,
      status: job.status,
      applied_date: job.appliedDate || null,
      notes: job.notes || null,
      contact_id: job.contactId || null,
      poster_name: job.posterName || null,
      poster_email: job.posterEmail || null,
      poster_phone: job.posterPhone || null,
      poster_role: job.posterRole || null,
    }).select().single();
    if (data) setJobs(prev => [mapJob(data), ...prev]);
  };

  const updateJobStatus = async (id: string, status: JobStatus) => {
    const now = new Date().toISOString();
    await supabase.from("jobs").update({ status, status_updated_at: now }).eq("id", id);
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status, statusUpdatedAt: now } : j));
  };

  const updateJob = async (id: string, updates: Partial<Job>) => {
    const dbUpdates: any = {};
    if (updates.posterName !== undefined) dbUpdates.poster_name = updates.posterName || null;
    if (updates.posterEmail !== undefined) dbUpdates.poster_email = updates.posterEmail || null;
    if (updates.posterPhone !== undefined) dbUpdates.poster_phone = updates.posterPhone || null;
    if (updates.posterRole !== undefined) dbUpdates.poster_role = updates.posterRole || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    if (updates.url !== undefined) dbUpdates.url = updates.url || null;
    if (updates.salary !== undefined) dbUpdates.salary = updates.salary || null;
    await supabase.from("jobs").update(dbUpdates).eq("id", id);
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const deleteJob = async (id: string) => {
    await supabase.from("jobs").delete().eq("id", id);
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const addContact = async (contact: Omit<Contact, "id" | "createdAt">) => {
    const { data } = await supabase.from("contacts").insert({
      name: contact.name,
      company: contact.company,
      role: contact.role,
      email: contact.email || null,
      phone: contact.phone || null,
      linkedin: contact.linkedin || null,
      notes: contact.notes || null,
      last_contacted_at: contact.lastContactedAt || null,
    }).select().single();
    if (data) setContacts(prev => [mapContact(data), ...prev]);
  };

  const deleteContact = async (id: string) => {
    await supabase.from("contacts").delete().eq("id", id);
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const addInterview = async (interview: Omit<Interview, "id">) => {
    const { data } = await supabase.from("interviews").insert({
      job_id: interview.jobId,
      type: interview.type,
      date: interview.date,
      time: interview.time || null,
      notes: interview.notes || null,
      status: interview.status,
    }).select().single();
    if (data) setInterviews(prev => [...prev, mapInterview(data)]);
  };

  // Job-Contact linking
  const linkContactToJob = async (jobId: string, contactId: string) => {
    const { data } = await supabase.from("job_contacts").insert({
      job_id: jobId,
      contact_id: contactId,
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

  // Auto-match contacts by company
  const getNetworkMatchesForJob = (job: Job) => {
    const companyLower = job.company.toLowerCase();
    const linkedIds = jobContacts.filter(jc => jc.jobId === job.id).map(jc => jc.contactId);
    const companyMatches = contacts.filter(c =>
      c.company.toLowerCase() === companyLower && !linkedIds.includes(c.id)
    );
    return companyMatches;
  };

  // Contact connections
  const addContactConnection = async (contactId1: string, contactId2: string, connectionType = "linkedin", notes?: string) => {
    const { data } = await supabase.from("contact_connections").insert({
      contact_id_1: contactId1,
      contact_id_2: contactId2,
      connection_type: connectionType,
      notes: notes || null,
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

  // Get contacts at same org
  const getContactsAtSameOrg = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return [];
    return contacts.filter(c => c.id !== contactId && c.company.toLowerCase() === contact.company.toLowerCase());
  };

  const getJobsByStatus = (status: JobStatus) => jobs.filter(j => j.status === status);
  const getContactForJob = (contactId?: string) => contacts.find(c => c.id === contactId);
  const getInterviewsForJob = (jobId: string) => interviews.filter(i => i.jobId === jobId);

  return {
    jobs, contacts, interviews, jobContacts, contactConnections, loading,
    addJob, updateJobStatus, updateJob, deleteJob,
    addContact, deleteContact,
    addInterview,
    linkContactToJob, unlinkContactFromJob, getContactsForJob, getNetworkMatchesForJob,
    addContactConnection, removeContactConnection, getConnectionsForContact, getContactsAtSameOrg,
    getJobsByStatus, getContactForJob, getInterviewsForJob,
  };
}
