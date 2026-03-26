import { Routes, Route } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import Dashboard from "@/pages/Dashboard";
import Jobs from "@/pages/Jobs";
import Contacts from "@/pages/Contacts";
import Applications from "@/pages/Applications";
import Recommendations from "@/pages/Recommendations";
import JobSearch from "@/pages/JobSearch";
import ProfileEditor from "@/pages/ProfileEditor";
import JobBoards from "@/pages/JobBoards";
import SkillsInsights from "@/pages/SkillsInsights";

import InterviewsPage from "@/pages/Interviews";
import { useJobTrackerStore } from "@/stores/jobTrackerStore";

export default function Index() {
  const store = useJobTrackerStore();

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 ml-64 p-8">
        <Routes>
          <Route index element={<Dashboard jobs={store.jobs} contacts={store.contacts} interviews={store.interviews} />} />
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
            />
          } />
          <Route path="contacts" element={
            <Contacts
              contacts={store.contacts}
              jobs={store.jobs}
              campaigns={store.campaigns}
              contactCampaigns={store.contactCampaigns}
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
          <Route path="applications" element={<Applications jobs={store.jobs} interviews={store.interviews} />} />
          <Route path="interviews" element={
            <InterviewsPage
              jobs={store.jobs}
              interviews={store.interviews}
              onAdd={store.addInterview}
              onUpdate={store.updateInterview}
              onDelete={store.deleteInterview}
            />
          } />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="job-search" element={<JobSearch onAddJob={store.addJob} existingJobs={store.jobs} />} />
          <Route path="profile" element={<ProfileEditor />} />
          <Route path="job-boards" element={<JobBoards />} />
          <Route path="skills-insights" element={<SkillsInsights />} />
        </Routes>
      </main>
    </div>
  );
}
