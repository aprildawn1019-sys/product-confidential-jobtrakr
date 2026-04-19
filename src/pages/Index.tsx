import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Menu, Briefcase } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import OnboardingTour, { hasCompletedTour } from "@/components/OnboardingTour";
import ResumeTourBanner from "@/components/ResumeTourBanner";
import Dashboard from "@/pages/Dashboard";
import Jobs from "@/pages/Jobs";
import JobCRM from "@/pages/JobCRM";
import Contacts from "@/pages/Contacts";

import NetworkMap from "@/pages/NetworkMap";
import JobSearch from "@/pages/JobSearch";
import ProfileEditor from "@/pages/ProfileEditor";
import JobBoards from "@/pages/JobBoards";
import SkillsInsights from "@/pages/SkillsInsights";
import InterviewsPage from "@/pages/Interviews";
import TargetCompanies from "@/pages/TargetCompanies";
import CoverLetters from "@/pages/CoverLetters";
import Reports from "@/pages/Reports";
import GettingStarted from "@/pages/GettingStarted";
import { HelpProvider } from "@/components/help/HelpProvider";
import { useJobTrackerStore } from "@/stores/jobTrackerStore";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

export default function Index() {
  const store = useJobTrackerStore();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tourRunning, setTourRunning] = useState(false);

  // Auto-start tour for first-time desktop visitors (Joyride targets the
  // sidebar which is hidden behind a sheet on mobile).
  useEffect(() => {
    if (isMobile) return;
    if (!hasCompletedTour()) {
      const t = setTimeout(() => setTourRunning(true), 600);
      return () => clearTimeout(t);
    }
  }, [isMobile]);

  // Allow any page to request the tour (e.g. the Dashboard "Take the tour" button).
  useEffect(() => {
    const handler = () => setTourRunning(true);
    window.addEventListener("jobtrakr:start-tour", handler);
    return () => window.removeEventListener("jobtrakr:start-tour", handler);
  }, []);

  return (
    <HelpProvider>
    <div className="flex min-h-screen bg-background">
      <OnboardingTour run={tourRunning} onFinish={() => setTourRunning(false)} />
      <ResumeTourBanner tourRunning={tourRunning} />
      <AppSidebar jobs={store.jobs} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {/* Mobile header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Briefcase className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-display text-base font-bold tracking-tight">JobTrackr</span>
          </div>
        </header>
      )}

      <main className={`flex-1 ${isMobile ? 'pt-14 p-4' : 'ml-64 p-8'}`}>
        <Routes>
          <Route index element={<Dashboard jobs={store.jobs} contacts={store.contacts} interviews={store.interviews} jobContacts={store.jobContacts} targetCompanies={store.targetCompanies} onUpdateStatus={store.updateJobStatus} onUpdateJob={store.updateJob} onUpdateContact={store.updateContact} />} />
          <Route path="jobs" element={
            <Jobs
              jobs={store.jobs}
              contacts={store.contacts}
              interviews={store.interviews}
              onAdd={store.addJob}
              onAddBulk={store.addJobsBulk}
              onUpdateStatus={store.updateJobStatus}
              onUpdateJob={store.updateJob}
              onDelete={store.deleteJob}
              onLinkContact={store.linkContactToJob}
              onUnlinkContact={store.unlinkContactFromJob}
              getContactsForJob={store.getContactsForJob}
              getNetworkMatchesForJob={store.getNetworkMatchesForJob}
              onAddInterview={store.addInterview}
              onUpdateInterview={store.updateInterview}
              onDeleteInterview={store.deleteInterview}
              getJobActivitiesForJob={store.getJobActivitiesForJob}
              targetCompanies={store.targetCompanies}
            />
          } />
          <Route path="jobs/:id" element={
            <JobCRM
              jobs={store.jobs}
              contacts={store.contacts}
              interviews={store.interviews}
              onUpdateStatus={store.updateJobStatus}
              onUpdateJob={store.updateJob}
              onLinkContact={store.linkContactToJob}
              onUnlinkContact={store.unlinkContactFromJob}
              getContactsForJob={store.getContactsForJob}
              getNetworkMatchesForJob={store.getNetworkMatchesForJob}
              onAddInterview={store.addInterview}
              onUpdateInterview={store.updateInterview}
              onDeleteInterview={store.deleteInterview}
              getActivitiesForContact={store.getActivitiesForContact}
              getJobActivitiesForJob={store.getJobActivitiesForJob}
              onAddJobActivity={store.addJobActivity}
              onDeleteJobActivity={store.deleteJobActivity}
              targetCompanies={store.targetCompanies}
            />
          } />
          <Route path="contacts" element={
            <Contacts
              contacts={store.contacts}
              jobs={store.jobs}
              campaigns={store.campaigns}
              contactCampaigns={store.contactCampaigns}
              jobContacts={store.jobContacts}
              contactConnections={store.contactConnections}
              onAdd={store.addContact}
              onAddBulk={store.addContactsBulk}
              onUpdate={store.updateContact}
              onDelete={store.deleteContact}
              getConnectionsForContact={store.getConnectionsForContact}
              getContactsAtSameOrg={store.getContactsAtSameOrg}
              onAddConnection={store.addContactConnection}
              onUpdateConnection={store.updateContactConnection}
              onRemoveConnection={store.removeContactConnection}
              getActivitiesForContact={store.getActivitiesForContact}
              onAddActivity={store.addContactActivity}
              onDeleteActivity={store.deleteContactActivity}
              getJobsForContact={store.getJobsForContact}
              getContactsForJob={store.getContactsForJob}
              getNetworkMatchesForJob={store.getNetworkMatchesForJob}
              onLinkContactToJob={store.linkContactToJob}
              onUnlinkContactFromJob={store.unlinkContactFromJob}
              onAddCampaign={store.addCampaign}
              onUpdateCampaign={store.updateCampaign}
              onDeleteCampaign={store.deleteCampaign}
              onToggleContactCampaign={store.toggleContactCampaign}
              getCampaignsForContact={store.getCampaignsForContact}
              recommendationRequests={store.recommendationRequests}
              onAddRecommendationRequest={store.addRecommendationRequest}
              onUpdateRecommendationRequest={store.updateRecommendationRequest}
              onDeleteRecommendationRequest={store.deleteRecommendationRequest}
              targetCompanies={store.targetCompanies}
              getTargetCompanyMatch={store.getTargetCompanyMatch}
              getRecommendationRequestsForContact={store.getRecommendationRequestsForContact}
            />
          } />
          
          <Route path="interviews" element={
            <InterviewsPage
              jobs={store.jobs}
              interviews={store.interviews}
              contacts={store.contacts}
              onAdd={store.addInterview}
              onUpdate={store.updateInterview}
              onDelete={store.deleteInterview}
              onUpdateContact={store.updateContact}
              getContactsForJob={store.getContactsForJob}
            />
          } />
          <Route path="job-search" element={<JobSearch onAddJob={store.addJob} existingJobs={store.jobs} contacts={store.contacts} targetCompanies={store.targetCompanies} />} />
          <Route path="profile" element={<ProfileEditor />} />
          <Route path="job-boards" element={<JobBoards />} />
          <Route path="skills-insights" element={<SkillsInsights />} />
          <Route path="target-companies" element={
            <TargetCompanies
              targetCompanies={store.targetCompanies}
              jobs={store.jobs}
              contacts={store.contacts}
              onAdd={store.addTargetCompany}
              onUpdate={store.updateTargetCompany}
              onDelete={store.deleteTargetCompany}
              onMerge={store.mergeTargetCompanies}
            />
          } />
          <Route path="cover-letters" element={<CoverLetters jobs={store.jobs} />} />
          <Route path="reports" element={<Navigate to="/settings/data-export" replace />} />
          <Route path="settings" element={<Navigate to="/settings/data-export" replace />} />
          <Route path="settings/data-export" element={<Reports />} />
          <Route path="getting-started" element={
            <GettingStarted
              jobs={store.jobs}
              contacts={store.contacts}
              targetCompanies={store.targetCompanies}
              interviews={store.interviews}
              coverLetterCount={store.jobs.filter(j => j.status === "applied" || j.status === "screening" || j.status === "interviewing" || j.status === "offer").length}
            />
          } />
          <Route path="network-map" element={
            <NetworkMap
              contacts={store.contacts}
              jobs={store.jobs}
              targetCompanies={store.targetCompanies}
              contactConnections={store.contactConnections}
              jobContacts={store.jobContacts}
              recommendationRequests={store.recommendationRequests}
              contactActivities={store.contactActivities}
              getConnectionsForContact={store.getConnectionsForContact}
              getRecommendationRequestsForContact={store.getRecommendationRequestsForContact}
              getActivitiesForContact={store.getActivitiesForContact}
              getContactsForJob={store.getContactsForJob}
              getJobsForContact={store.getJobsForContact}
              onAddConnection={store.addContactConnection}
            />
          } />
        </Routes>
      </main>
    </div>
    </HelpProvider>
  );
}
