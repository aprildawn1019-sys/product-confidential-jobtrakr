import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Job, Contact, Interview, JobStatus } from "@/types/jobTracker";

// Map DB rows to app types
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

export function useJobTrackerStore() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [jobsRes, contactsRes, interviewsRes] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("interviews").select("*").order("date", { ascending: true }),
    ]);
    if (jobsRes.data) setJobs(jobsRes.data.map(mapJob));
    if (contactsRes.data) setContacts(contactsRes.data.map(mapContact));
    if (interviewsRes.data) setInterviews(interviewsRes.data.map(mapInterview));
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
    }).select().single();
    if (data) setJobs(prev => [mapJob(data), ...prev]);
  };

  const updateJobStatus = async (id: string, status: JobStatus) => {
    await supabase.from("jobs").update({ status }).eq("id", id);
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
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

  const getJobsByStatus = (status: JobStatus) => jobs.filter(j => j.status === status);
  const getContactForJob = (contactId?: string) => contacts.find(c => c.id === contactId);
  const getInterviewsForJob = (jobId: string) => interviews.filter(i => i.jobId === jobId);

  return {
    jobs, contacts, interviews, loading,
    addJob, updateJobStatus, deleteJob,
    addContact, deleteContact,
    addInterview,
    getJobsByStatus, getContactForJob, getInterviewsForJob,
  };
}
