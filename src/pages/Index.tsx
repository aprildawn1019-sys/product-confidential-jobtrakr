import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Menu, Briefcase } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import Dashboard from "@/pages/Dashboard";
import Jobs from "@/pages/Jobs";
import JobCRM from "@/pages/JobCRM";
import Contacts from "@/pages/Contacts";

import Recommendations from "@/pages/Recommendations";
import JobSearch from "@/pages/JobSearch";
import ProfileEditor from "@/pages/ProfileEditor";
import JobBoards from "@/pages/JobBoards";
import SkillsInsights from "@/pages/SkillsInsights";
import InterviewsPage from "@/pages/Interviews";
import TargetCompanies from "@/pages/TargetCompanies";
import CoverLetters from "@/pages/CoverLetters";
import { useJobTrackerStore } from "@/stores/jobTrackerStore";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

export default function Index() {
  const store = useJobTrackerStore();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
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
              getRecommendationRequestsForContact={store.getRecommendationRequestsForContact}
            />
          } />
          <Route path="applications" element={<Applications jobs={store.jobs} interviews={store.interviews} onUpdateJob={store.updateJob} />} />
          <Route path="interviews" element={
            <InterviewsPage
              jobs={store.jobs}
              interviews={store.interviews}
              contacts={store.contacts}
              onAdd={store.addInterview}
              onUpdate={store.updateInterview}
              onDelete={store.deleteInterview}
              onUpdateContact={store.updateContact}
            />
          } />
          <Route path="recommendations" element={<Recommendations jobs={store.jobs} contacts={store.contacts} targetCompanies={store.targetCompanies} onAddJob={store.addJob} />} />
          <Route path="job-search" element={<JobSearch onAddJob={store.addJob} existingJobs={store.jobs} />} />
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
            />
          } />
          <Route path="cover-letters" element={<CoverLetters jobs={store.jobs} />} />
        </Routes>
      </main>
    </div>
  );
}
